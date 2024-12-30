import React, { useState, useRef } from 'react';
// import { Amplify } from 'aws-amplify';
// import Auth from '@aws-amplify/auth';
// import Auth from '@aws-amplify/auth';
import Amplify, { Auth } from 'aws-amplify';
import * as AWS from 'aws-sdk';

// Configure AWS Amplify and S3
Amplify.configure({
  aws_cognito_region: 'ap-south-1',
  aws_user_pools_id: 'ap-south-1_PwyfEnB7p',
  aws_user_pools_web_client_id: '5ulakf81dnhrfp30sa97g4s30a',
});

AWS.config.update({
  region: 'ap-south-1',
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'f81dnhrfp30sa97g4s30a',
  }),
});

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  params: { Bucket: 'recording' },
});

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const signIn = async () => {
    try {
      const user = await Auth.signIn('dinesh', 'Dineshdina@23');
      setUser(user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error signing in', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);
        audioChunksRef.current = [];
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch (error) {
      console.error('Error accessing microphone', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadToS3 = async () => {
    if (!audioUrl) return;
    try {
      const response = await fetch(audioUrl);
      const audioBlob = await response.blob();
      const fileName = `recordings/${Date.now()}.wav`;
      const params = {
        Key: fileName,
        Body: audioBlob,
        ContentType: 'audio/wav',
      };
      await s3.upload(params).promise();
      alert('Audio uploaded successfully!');
    } catch (error) {
      console.error('Error uploading to S3', error);
    }
  };

  return (
    <div>
      {!isAuthenticated ? (
        <button onClick={signIn}>Sign In</button>
      ) : (
        <div>
          <h1>Welcome, {user.username}</h1>
          <div>
            {recording ? (
              <button onClick={stopRecording}>Stop Recording</button>
            ) : (
              <button onClick={startRecording}>Start Recording</button>
            )}
          </div>
          {audioUrl && (
            <div>
              <audio controls src={audioUrl}></audio>
              <button onClick={uploadToS3}>Upload to S3</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
