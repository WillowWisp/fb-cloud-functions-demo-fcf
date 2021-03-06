import * as functions from 'firebase-functions';
import * as admins from 'firebase-admin';
import * as moment from 'moment';
// import admin = require('firebase-admin');
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

export const getUserByToken = functions.https.onRequest((req, res) => {
  const tokenId = req.get('Authorization')?.split('Bearer ')[1];

  verifyJWT(tokenId)
    .then(async (response) => {
      const user = await admins.auth().getUser(response.uid);
      if (user.email) {
        // Temp fix. TODO
        const userData = (await admins.firestore()
          .collection('users')
          .doc(user.email)
          .get()).data()
        
        res.json(userData);
      }
    })
    .catch(err => {
      console.log(err);
      if (err === '401') {
        res.status(401).send({ code: 'custom/unauthorized', message: 'Unauthorized' });
      }
    });
})

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
          .update({ currentLearnSession: { courseId: courseId, question: null, questionsTotal: parseInt(questionsTotal), questionsAnswered: 0, questionsAnsweredCorrect: 0, startAt: moment().toISOString() } });
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

function getElementsFromArray(array: Array<any>, numberOfElements: number): Array<any> {
  const shuffledArr = shuffle(array);
  return shuffledArr.splice(0, numberOfElements);
}

// export const getSessionQuestion = functions.https.onRequest((req, res) => {
//   const tokenId = req.get('Authorization')?.split('Bearer ')[1];

//   verifyJWT(tokenId)
//     .then(async (response) => {
//       const user = await admins.auth().getUser(response.uid);
//       if (user.email) {
//         //Temp fix. TODO

//         const userDoc = admins.firestore()
//           .collection('users')
//           .doc(user.email);

//         const currentLearnSession = (await userDoc.get()).get('currentLearnSession');
//         if (!currentLearnSession) {
//           res.status(500).send({ code: 'custom/internal', message: 'currentLearnSession not found.' });
//         }

//         if (currentLearnSession.question) {
//           res.json(currentLearnSession.question);
//         } else {
//           // Init question
//           const exerciseTypes = ['eng-vie-sentence-picking', 'eng-vie-sentence-ordering'];
//           // const indexRandom = Math.floor(Math.random() * exerciseTypes.length);
//           const indexRandom = 1;
          
//           switch (exerciseTypes[indexRandom]) {
//             case 'eng-vie-sentence-picking':
//               const questionsQuery = await admins.firestore()
//                 .collection('exercise-data')
//                 .doc('0')
//                 .collection('eng-vie-sentence-picking')
//                 .where('courseId', '==', currentLearnSession.courseId)
//                 .get();
//               const questionsData = questionsQuery.docs.map(doc => {
//                 return {id: doc.id, ...doc.data()} as any;
//               });
              
//               const indexSentenceRnd = Math.floor(Math.random() * sentencesResponse.length);
//               const id: string = sentencesResponse[indexSentenceRnd].id;
//               const questionStr: string = sentencesResponse[indexSentenceRnd].eng;
//               const answer: string = sentencesResponse[indexSentenceRnd].vie[0];

//               break;
//             case 'eng-vie-sentence-ordering':
//               // try {
//               const sentencesQuery = await admins.firestore()
//                 .collection('exercise-data')
//                 .doc('0')
//                 .collection('sentences')
//                 .where('courseId', '==', currentLearnSession.courseId)
//                 .get();
  
//               const sentencesResponse = sentencesQuery.docs.map(doc => {
//                 return {id: doc.id, ...doc.data()} as any;
//               });
  
//               const indexSentenceRnd = Math.floor(Math.random() * sentencesResponse.length);
//               const id: string = sentencesResponse[indexSentenceRnd].id;
//               const questionStr: string = sentencesResponse[indexSentenceRnd].eng;
//               const answer: string = sentencesResponse[indexSentenceRnd].vie[0];
//               let choices: Array<string> = answer.split(' ');
//               choices = shuffle(choices);
  
//               const responseJSON = {
//                 id: id,
//                 type: 'eng-vie-sentence-ordering',
//                 questionStr: questionStr,
//                 choices: choices
//               };
//               await userDoc.update({ 'currentLearnSession.question': responseJSON });
//               console.log(responseJSON);
  
//               res.json(responseJSON);
//               break;
//           }
//         }
//       }
//     })
//     .catch(err => {
//       res.status(500).send(err);
//     });
// })

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
          let responseJSON = {};
          // Init question
          const exerciseTypes = ['eng-vie-sentence-picking', 'eng-vie-sentence-ordering', 'vie-eng-vocab-picking'];
          const indexRandom = Math.floor(Math.random() * exerciseTypes.length);
          // const indexRandom = 2;

          if (exerciseTypes[indexRandom] === 'vie-eng-vocab-picking') {

            const questionsQuery = await admins.firestore()
              .collection('exercise-data')
              .doc('0')
              .collection('vie-eng-vocab-picking')
              .where('courseId', '==', currentLearnSession.courseId)
              .get();

            const questionsData = questionsQuery.docs.map(doc => {
              return {...doc.data(), id: doc.id} as any;
            });

            const indexSentenceRnd = Math.floor(Math.random() * questionsData.length);
            const questionId: string = questionsData[indexSentenceRnd].id;
            const questionStr: string = questionsData[indexSentenceRnd].vieMeaning;
            const questionAnswer: string = questionsData[indexSentenceRnd].engWord;
            const questionIllustration: string = questionsData[indexSentenceRnd].illustration;

            let choices: Array<any> = []; // { text: 'boy', illustration: 'boy.png' }
            choices.push({
              text: questionAnswer,
              illustration: questionIllustration
            });
            
            // Add more random words to 'choices'
            const questionsDataLeft = questionsData.filter(question => question.id !== questionId);
            const twoRandomQuestions = getElementsFromArray(questionsDataLeft, 2);
            const twoRandomChoices = twoRandomQuestions.map(question => {
              return {
                text: question.engWord,
                illustration: question.illustration
              };
            });

            choices = choices.concat(twoRandomChoices);
            choices = shuffle(choices);

            responseJSON = {
              id: questionId,
              type: 'vie-eng-vocab-picking',
              questionStr: questionStr,
              choices: choices
            };

          } else if (exerciseTypes[indexRandom] === 'eng-vie-sentence-picking') {

            const questionsQuery = await admins.firestore()
              .collection('exercise-data')
              .doc('0')
              .collection('eng-vie-sentence-picking')
              .where('courseId', '==', currentLearnSession.courseId)
              .get();
            const questionsData = questionsQuery.docs.map(doc => {
              return {id: doc.id, ...doc.data()} as any;
            });
            
            const indexQuestionRnd = Math.floor(Math.random() * questionsData.length);
            const id: string = questionsData[indexQuestionRnd].id;
            const questionStr: string = questionsData[indexQuestionRnd].eng;
            const dummyChoices: Array<string> = questionsData[indexQuestionRnd].choices;
            let choices: Array<string> = getElementsFromArray(dummyChoices, 2);
            choices.push(questionsData[indexQuestionRnd].correctAnswers[0]);
            choices = shuffle(choices);

            responseJSON = {
              id: id,
              type: exerciseTypes[indexRandom],
              questionStr: questionStr,
              choices: choices,
            }

          } else if (exerciseTypes[indexRandom] === 'eng-vie-sentence-ordering') {

            const sentencesQuery = await admins.firestore()
              .collection('exercise-data')
              .doc('0')
              .collection('sentences')
              .where('courseId', '==', currentLearnSession.courseId)
              .get();

            const sentencesResponse = sentencesQuery.docs.map(doc => {
              return {id: doc.id, ...doc.data()} as any;
            });

            const indexSentenceRnd = Math.floor(Math.random() * sentencesResponse.length);
            const id: string = sentencesResponse[indexSentenceRnd].id;
            const questionStr: string = sentencesResponse[indexSentenceRnd].eng;
            const answer: string = sentencesResponse[indexSentenceRnd].vie[0];
            let choices: Array<string> = answer.split(' ');
            
            // Add more random words to 'choices'
            const vieWordsData = (await admins.firestore()
              .collection('exercise-data')
              .doc('0')
              .collection('words')
              .doc('vie')
              .get()).data();

            let vieWordList: Array<string> = [];
            if (vieWordsData) {
              console.log('co data');
              console.log(vieWordsData);
              vieWordList = [...vieWordsData.wordList];
            } else {
              console.log('ko co data');
              vieWordList = ['họ', 'ta', 'bò', 'đàn', 'ông', 'phụ', 'nữ', 'con', 'mèo', 'uống', 'sữa'];
            }

            for (let i = 0; i < 4; i++) { // TODO: replace 4 with number of dummy words depending on difficulty
              const indexWordRnd = Math.floor(Math.random() * vieWordList.length);
              choices.push(vieWordList[indexWordRnd]);
            }

            console.log(choices);

            choices = shuffle(choices);

            responseJSON = {
              id: id,
              type: 'eng-vie-sentence-ordering',
              questionStr: questionStr,
              choices: choices
            };
          }

          
          console.log('responseJSON');
          console.log(responseJSON);
          await userDoc.update({ 'currentLearnSession.question': responseJSON });
          console.log({ ...currentLearnSession, question: responseJSON });

          res.json({ ...currentLearnSession, question: responseJSON });
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
          console.log('co question');
          console.log(currentLearnSession);
          const questionId = currentLearnSession.question.id;
          const questionType = currentLearnSession.question.type;

          let isCorrect = false;
          let correctAnswer;

          console.log('co questionType');
          console.log(questionType);
          
          console.log('co questionId');
          console.log(questionId);

          // START Set isCorrect & correctAnswer
          if (questionType === 'vie-eng-vocab-picking') {
            const questionDoc = await admins.firestore()
              .collection('exercise-data')
              .doc('0')
              .collection('vie-eng-vocab-picking')
              .doc(questionId)
              .get();

            const questionData = questionDoc.data() as any;

            console.log('questionData');
            console.log(questionData);

            if (questionData.engWord.toLowerCase().trim() === answer.toLowerCase().trim()) {
              isCorrect = true;
            } else {
              isCorrect = false;
            }
            correctAnswer = questionData.engWord;
            console.log('isCorrect ne');
            console.log(isCorrect);
          }

          if (questionType === 'eng-vie-sentence-picking') {
            const questionDoc = await admins.firestore()
              .collection('exercise-data')
              .doc('0')
              .collection('eng-vie-sentence-picking')
              .doc(questionId)
              .get();

            const questionData = questionDoc.data() as any;
            if (questionData.correctAnswers.includes(answer.toLowerCase().trim())) {
              isCorrect = true;
            } else {
              isCorrect = false;
            }
            correctAnswer = questionData.correctAnswers[0];
          }

          if (questionType === 'eng-vie-sentence-ordering') {
            const questionDoc = await admins.firestore()
              .collection('exercise-data')
              .doc('0')
              .collection('sentences')
              .doc(questionId)
              .get();

            let questionCorrectAnswers: Array<string> = questionDoc.get('vie');

            if (questionCorrectAnswers.includes(answer.toLowerCase().trim())) {
              // questionsAnsweredCorrect = parseInt(currentLearnSession.questionsAnsweredCorrect) + 1;
              isCorrect = true;
            } else {
              isCorrect = false;
            }
            correctAnswer = questionCorrectAnswers[0];
          }
          // END Set isCorrect & correctAnswer
          
          // Update currentLearnSession & set isDone
          let isDone; // JSON RESPONSE
          await userDoc.update({ 'currentLearnSession.question': null });
          const questionsAnswered = parseInt(currentLearnSession.questionsAnswered) + 1;
          if (questionsAnswered >= parseInt(currentLearnSession.questionsTotal)) {
            isDone = true;
          } else {
            isDone = false;
          }

          let questionsAnsweredCorrect = parseInt(currentLearnSession.questionsAnsweredCorrect);
          if (isCorrect == true) {
            questionsAnsweredCorrect += 1;
          }
          
          await userDoc.update({
            'currentLearnSession.questionsAnswered': questionsAnswered,
            'currentLearnSession.questionsAnsweredCorrect': questionsAnsweredCorrect,
          })

          res.json({ isCorrect: isCorrect, isDone: isDone, correctAnswer: correctAnswer });
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

export const importExerciseEngVieSentencePicking = functions.https.onRequest(async (req, res) => {
  const { engVieSentencePicking } = req.body;

  for (let i = 0; i < engVieSentencePicking.length; i++) {
    await admins.firestore()
      .collection('exercise-data')
      .doc('0')
      .collection('eng-vie-sentence-picking')
      .add(engVieSentencePicking[i]);
  }

  res.send(200).send();
})

export const importExerciseVieEngVocabPicking = functions.https.onRequest(async (req, res) => {
  const { vieEngVocabPicking } = req.body;

  for (let i = 0; i < vieEngVocabPicking.length; i++) {
    await admins.firestore()
      .collection('exercise-data')
      .doc('0')
      .collection('vie-eng-vocab-picking')
      .add(vieEngVocabPicking[i]);
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

export const importVieWords = functions.https.onRequest(async (req, res) => {
  const { wordList } = req.body;
  console.log(wordList);

  // await admin.firestore()
  //   .collection('exercise-data')
  //   .doc('0')
  //   .collection('words')
  //   .doc('vie')
  //   .set({ wordList: [...wordList] });

  const vieWordsDoc = await admins.firestore()
  .collection('exercise-data')
  .doc('0')
  .collection('words')
  .doc('vie');

  // await vieWordsDoc.set({ wordList: [...wordList] });
  const vieWordsObj = (await vieWordsDoc.get()).data() as any;
  let oldWordList: Array<any> = [];
  let newWordList: Array<any> = [];

  if (vieWordsObj && vieWordsObj.wordList) {
    oldWordList = [...vieWordsObj.wordList];
  } else {
    oldWordList = [];
  }
  
  wordList.forEach((word: any) => {
    if (!oldWordList.includes(word)) {
      newWordList.push(word);
    }
  });
  await vieWordsDoc.set({ wordList: [...oldWordList, ...newWordList] });

  // if (vieWordsObj.wordList) {
  //   wordList.forEach((word: any) => {
  //     if (!vieWordsObj.wordList.includes(word)) {
  //       newWordList.push(word);
  //     }
  //   });
  //   await vieWordsDoc.set({ wordList: [...vieWordsObj.wordList, ...newWordList] });
  // } else {
  //   newWordList = [...wordList];
  //   await vieWordsDoc.set({ wordList: [...newWordList] });
  // }
  
  
  // newWordList = [...wordList];
  // await vieWordsDoc.set({ wordList: [...newWordList] });

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