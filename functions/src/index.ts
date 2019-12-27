import * as functions from 'firebase-functions';
import * as admins from 'firebase-admin';
// import * as express from 'express';
// import * as bodyParser from "body-parser";

admins.initializeApp(functions.config().firebase);
// const firestore = admins.firestore();

// const app = express();
// const main = express();

// main.use('/api/v1', app);
// main.use(bodyParser.json());

// export const webApi = functions.https.onRequest(main);

// app.get('/warmup', (request, response) => {
//   response.send('Warming up');
// })

export const signUp = functions.https.onRequest(async (req, res) => {
  // try {
  //   const { username, fullName, age } = req.body;
  //   const data = {
  //     username,
  //     fullName,
  //     age,
  //   };

  //   const userRef = await firestore
  //     .collection('users')
  //     .add(data);

  //   const user = await userRef.get();

  //   res.json({
  //     id: userRef.id,
  //     data: user.data(),
  //   });
  // } catch(err) {
  //   res.status(500).send(err);
  // }

  const { displayName, email, password } = req.body;

  if (!email) {
    res.status(500).send({code: 'custom/no-email-provided', message: 'Email must be provided'});
  }

  admins.auth().createUser({ displayName, email, password, emailVerified: true })
    .then(async (response) => {
      const userData = {
        uid: response.uid,
        displayName: response.displayName,
        email: response.email,
      }

      if (response.email) {
        // Temp fix. TODO
        await admins.firestore()
          .collection('users')
          .doc(response.email)
          .set(userData);
      }

      res.json(userData);
    })
    .catch(err => {
      res.status(500).send(err);
    })
});

const verifyJWT = (tokenStr: string | undefined) => {
  return new Promise<admins.auth.DecodedIdToken>((resolve, reject) => {
    if (tokenStr) {
      admins.auth().verifyIdToken(tokenStr)
        .then(decoded => {
          resolve(decoded);
        })
        .catch(err => {
          reject('401');
        })
    } else {
      reject('401');
    }
  })
}

export const startLearnSession = functions.https.onRequest((req, res) => {
  const tokenId = req.get('Authorization')?.split('Bearer ')[1];

  verifyJWT(tokenId)
    .then(async (response) => {
      const { courseId, questionsTotal } = req.body;

      const user = await admins.auth().getUser(response.uid);
      if (user.email) {
        // Temp fix. TODO
        await admins.firestore()
          .collection('users')
          .doc(user.email)
          .update({ currentLearnSession: { courseId: courseId, question: null, questionsTotal: parseInt(questionsTotal), questionsAnswered: 0, questionsAnsweredCorrect: 0, } });
        res.send(200).send();
      }
    })
    .catch(err => {
      console.log(err);
      if (err === '401') {
        res.status(401).send({ code: 'custom/unauthorized', message: 'Unauthorized' });
      }
    })

})

function shuffle(array: Array<any>): Array<any> {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

export const getSessionQuestion = functions.https.onRequest((req, res) => {
  const tokenId = req.get('Authorization')?.split('Bearer ')[1];

  verifyJWT(tokenId)
    .then(async (response) => {
      const user = await admins.auth().getUser(response.uid);
      if (user.email) {
        //Temp fix. TODO

        const userDoc = admins.firestore()
          .collection('users')
          .doc(user.email);

        const currentLearnSession = (await userDoc.get()).get('currentLearnSession');
        if (!currentLearnSession) {
          res.status(500).send({ code: 'custom/internal', message: 'currentLearnSession not found.' });
        }

        if (currentLearnSession.question) {
          res.json(currentLearnSession.question);
        } else {
          // Init question
          const exerciseTypes = ['vie-eng-sentence-ordering', 'eng-vie-sentence-ordering'];
          // const indexRandom = Math.floor(Math.random() * (exerciseTypes.length - 1));
          const indexRandom = 1;
          
          switch (exerciseTypes[indexRandom]) {
            case 'eng-vie-sentence-ordering':
              // try {
              const sentencesQuery = await admins.firestore()
                .collection('exercise-data')
                .doc('0')
                .collection('sentences')
                .where('courseId', '==', currentLearnSession.courseId)
                .get();
  
              const sentencesResponse = sentencesQuery.docs.map(doc => {
                return {id: doc.id, ...doc.data()} as any;
              });
  
              const indexSentenceRnd = Math.floor(Math.random() * (sentencesResponse.length - 1));
              const id: string = sentencesResponse[indexSentenceRnd].id;
              const questionStr: string = sentencesResponse[indexSentenceRnd].eng;
              const answer: string = sentencesResponse[indexSentenceRnd].vie[0];
              let choices: Array<string> = answer.split(' ');
              choices.push('họ', 'ta', 'bò', 'con');
              choices = shuffle(choices);
  
              const responseJSON = {
                id: id,
                type: 'eng-vie-sentence-ordering',
                questionStr: questionStr,
                choices: choices
              };
              await userDoc.update({ 'currentLearnSession.question': responseJSON });
              console.log(responseJSON);
  
              res.json(responseJSON);
          }
        }
      }
    })
    .catch(err => {
      res.status(500).send(err);
    });
})

export const setQuestionOfCurrentLearnSession = functions.https.onRequest((req, res) => {
  const tokenId = req.get('Authorization')?.split('Bearer ')[1];

  verifyJWT(tokenId)
    .then(async (response) => {
      const user = await admins.auth().getUser(response.uid);
      if (user.email) {
        //Temp fix. TODO

        const userDoc = admins.firestore()
          .collection('users')
          .doc(user.email);

        const currentLearnSession = (await userDoc.get()).get('currentLearnSession');
        if (!currentLearnSession) {
          res.status(500).send({ code: 'custom/internal', message: 'currentLearnSession not found.' });
        }

        if (currentLearnSession.question) {
          res.json(currentLearnSession);
        } else {
          // Init question
          const exerciseTypes = ['vie-eng-sentence-ordering', 'eng-vie-sentence-ordering'];
          // const indexRandom = Math.floor(Math.random() * (exerciseTypes.length - 1));
          const indexRandom = 1;
          
          switch (exerciseTypes[indexRandom]) {
            case 'eng-vie-sentence-ordering':
              // try {
              const sentencesQuery = await admins.firestore()
                .collection('exercise-data')
                .doc('0')
                .collection('sentences')
                .where('courseId', '==', currentLearnSession.courseId)
                .get();
  
              const sentencesResponse = sentencesQuery.docs.map(doc => {
                return {id: doc.id, ...doc.data()} as any;
              });
  
              const indexSentenceRnd = Math.floor(Math.random() * (sentencesResponse.length - 1));
              const id: string = sentencesResponse[indexSentenceRnd].id;
              const questionStr: string = sentencesResponse[indexSentenceRnd].eng;
              const answer: string = sentencesResponse[indexSentenceRnd].vie[0];
              let choices: Array<string> = answer.split(' ');
              choices.push('họ', 'ta', 'bò', 'con');
              choices = shuffle(choices);
  
              const responseJSON = {
                id: id,
                type: 'eng-vie-sentence-ordering',
                questionStr: questionStr,
                choices: choices
              };
              console.log('responseJSON');
              console.log(responseJSON);
              await userDoc.update({ 'currentLearnSession.question': responseJSON });
              console.log({ ...currentLearnSession, question: responseJSON });
  
              res.json({ ...currentLearnSession, question: responseJSON });
          }
        }
      }
    })
    .catch(err => {
      res.status(500).send(err);
    });
})

export const checkSessionQuestionAnswer = functions.https.onRequest((req, res) => {
  const tokenId = req.get('Authorization')?.split('Bearer ')[1];
  const { answer } = req.body;
  console.log('co answer');
  console.log(answer);

  verifyJWT(tokenId)
    .then(async (response) => {
      const user = await admins.auth().getUser(response.uid);
      if (user.email) {
        //Temp fix. TODO

        const userDoc = admins.firestore()
          .collection('users')
          .doc(user.email);

        const currentLearnSession = (await userDoc.get()).get('currentLearnSession');
        if (!currentLearnSession) {
          res.status(500).send({ code: 'custom/internal', message: 'currentLearnSession not found.' });
        }

        if (currentLearnSession.question) {
          console.log('co question')
          const questionId = currentLearnSession.question.id;
          const questionType = currentLearnSession.question.type;

          if (questionType === 'eng-vie-sentence-ordering') {
            const questionDoc = await admins.firestore()
              .collection('exercise-data')
              .doc('0')
              .collection('sentences')
              .doc(questionId)
              .get();

            console.log('co questionDoc');
            console.log(questionDoc.data());

            // let questionCorrectAnswers: Array<string> = [];
            // if (questionDoc.data() !== undefined) {
            //   questionCorrectAnswers = questionDoc.data().vie;
            // }

            let questionCorrectAnswers: Array<string> = questionDoc.get('vie');

            console.log('co questionCorrectAnswers');
            console.log(questionCorrectAnswers);

            console.log('answer sau');
            console.log(answer.toLowerCase().trim());

            let newQuestionsAnsweredCorrect = parseInt(currentLearnSession.questionsAnsweredCorrect);
            let isCorrect; // JSON RESPONSE
            if (questionCorrectAnswers.includes(answer.toLowerCase().trim())) {
              console.log('dung roi')
              newQuestionsAnsweredCorrect += 1;
              isCorrect = true;
            } else {
              console.log('sai roi')
              isCorrect = false;
            }

            // Update currentLearnSession
            let isDone; // JSON RESPONSE
            await userDoc.update({ 'currentLearnSession.question': null });
            const newQuestionsAnswered = parseInt(currentLearnSession.questionsAnswered) + 1;
            if (newQuestionsAnswered >= parseInt(currentLearnSession.questionsTotal)) {
              console.log('xong bai');
              isDone = true;
              // await userDoc.update({ 'currentLearnSession': null });
            } else {
              console.log('chua xong bai');
              isDone = false;
              // await userDoc.update({
              //   'currentLearnSession.questionsAnswered': newQuestionsAnswered,
              //   'currentLearnSession.questionsAnsweredCorrect': newQuestionsAnsweredCorrect,
              // })
            }
            
            await userDoc.update({
              'currentLearnSession.questionsAnswered': newQuestionsAnswered,
              'currentLearnSession.questionsAnsweredCorrect': newQuestionsAnsweredCorrect,
            })

            res.json({ isCorrect: isCorrect, isDone: isDone, correctAnswer: questionCorrectAnswers[0] });
          }
        } else {
          res.status(500).send({ code: 'custom/internal', message: 'There is no question to check' });
        }
      }
    })
    .catch(err => {
      res.status(500).send(err);
    });
})

export const getCurrentLearnSession = functions.https.onRequest((req, res) => {
  const tokenId = req.get('Authorization')?.split('Bearer ')[1];

  verifyJWT(tokenId)
    .then(async (response) => {
      const user = await admins.auth().getUser(response.uid);
      if (user.email) {
        //Temp fix. TODO

        const userDoc = admins.firestore()
          .collection('users')
          .doc(user.email);

        console.log('userDoc');
        console.log(userDoc);

        const currentLearnSession = (await userDoc.get()).get('currentLearnSession');
        console.log('currentLearnSession');
        console.log(currentLearnSession);
        if (!currentLearnSession) {
          res.status(500).send({ code: 'custom/internal', message: 'currentLearnSession not found.' });
        } else {
          res.json(currentLearnSession);
        }
      }
    })
    .catch(err => {
      res.status(500).send(err);
    });
})



export const importCourses = functions.https.onRequest(async (req, res) => {
  const { courses } = req.body;

  for (let i = 0; i < courses.length; i++) {
    await admins.firestore()
      .collection('courses')
      .add(courses[i]);
  }

  res.send(200).send();
})

export const importExerciseSentences = functions.https.onRequest(async (req, res) => {
  const { sentences } = req.body;

  for (let i = 0; i < sentences.length; i++) {
    await admins.firestore()
      .collection('exercise-data')
      .doc('0')
      .collection('sentences')
      .add(sentences[i]);
  }

  res.send(200).send();
})

export const importExerciseVocabularies = functions.https.onRequest(async (req, res) => {
  const { vocabularies } = req.body;

  for (let i = 0; i < vocabularies.length; i++) {
    await admins.firestore()
      .collection('exercise-data')
      .doc('0')
      .collection('vocabularies')
      .add(vocabularies[i]);
  }

  res.send(200).send();
})

// export const onImageUpload = functions.storage.object()
//   .onFinalize((event: functions.storage.ObjectMetadata, context: functions.EventContext) => {
//     console.log(event);
//     return;
//   });

// export const onFileChange = functions.storage.object()
//   .onMetadataUpdate((event: functions.storage.ObjectMetadata, context: functions.EventContext) => {
//     console.log(event);
//     return;
//   });