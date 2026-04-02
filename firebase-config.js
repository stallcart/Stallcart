import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyB1bnXrYuwJQ-prQN1hsPYwr_oR2WwghjU",
    authDomain: "stallcart-2baa5.firebaseapp.com",
    projectId: "stallcart-2baa5",
    appId: "1:795612911191:web:c5ca9a3f1cf8872d0cf512"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { collection, getDocs, query, orderBy, onSnapshot, addDoc, updateDoc, doc, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Admin auth (hardcoded for simplicity)
export const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

export default app;

