/* eslint-disable unicode-bom */

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBNdTfP7zS6okLQIC3ZETYsDOHT1pa2fZQ",
  authDomain: "hindavi-dairy.firebaseapp.com",
  projectId: "hindavi-dairy",
  storageBucket: "hindavi-dairy.firebasestorage.app",
  messagingSenderId: "880256800689",
  appId: "1:880256800689:web:8558d398e27ab083968f90"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);