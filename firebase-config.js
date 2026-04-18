// Firebase Configuration Module
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, remove } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js";
import { getStorage, ref as sRef, uploadString, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCOTtNsD-Qx_CyBoJEklgpL_caqtnGEwqQ",
  authDomain: "alam-transportation.firebaseapp.com",
  databaseURL: "https://alam-transportation-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "alam-transportation",
  storageBucket: "alam-transportation.firebasestorage.app",
  messagingSenderId: "391557709610",
  appId: "1:391557709610:web:0f3cd4f9e4a390bcf52853",
  measurementId: "G-49HKSD1MGS"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const stor = getStorage(app);
const analytics = getAnalytics(app);

// Expose Firebase helpers to global scope
window._fbDb = db;
window._fbStor = stor;
window._fbRef = ref;
window._fbSet = set;
window._fbGet = get;
window._fbOnValue = onValue;
window._fbRemove = remove;
window._fbSRef = sRef;
window._fbUploadStr = uploadString;
window._fbGetDlUrl = getDownloadURL;
window._fbDelObj = deleteObject;
window._firebaseReady = true;

// Notify any waiters
if (window._fbReadyResolvers) {
  window._fbReadyResolvers.forEach(fn => fn());
  window._fbReadyResolvers = [];
}
document.dispatchEvent(new Event('firebase-ready'));