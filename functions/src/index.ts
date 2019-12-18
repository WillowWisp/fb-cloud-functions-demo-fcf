import * as functions from 'firebase-functions';
import * as admins from 'firebase-admin';
// import * as express from 'express';
// import * as bodyParser from "body-parser";

admins.initializeApp(functions.config().firebase);
const firestore = admins.firestore();

// const app = express();
// const main = express();

// main.use('/api/v1', app);
// main.use(bodyParser.json());

// export const webApi = functions.https.onRequest(main);

// app.get('/warmup', (request, response) => {
//   response.send('Warming up');
// })

export const helloWorld = functions.https.onRequest(async (request, response) => {
  try {
    const { username, fullName, age } = request.body;
    const data = {
      username,
      fullName,
      age,
    };

    const userRef = await firestore
      .collection('users')
      .add(data);

    const user = await userRef.get();

    response.json({
      id: userRef.id,
      data: user.data(),
    });
  } catch(err) {
    response.status(500).send(err);
  }
});

export const onImageUpload = functions.storage.object()
  .onFinalize((event: functions.storage.ObjectMetadata, context: functions.EventContext) => {
    console.log(event);
    return;
  });

export const onFileChange = functions.storage.object()
  .onMetadataUpdate((event: functions.storage.ObjectMetadata, context: functions.EventContext) => {
    console.log(event);
    return;
  });