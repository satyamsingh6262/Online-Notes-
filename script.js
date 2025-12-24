// --- IMPORT FIREBASE FUNCTIONS ---
// Accessing the libraries we loaded in HTML
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCl2XGQTBlp3rligYirYo06CZjUNHC7GIo",
  authDomain: "online-notes-of-life.firebaseapp.com",
  projectId: "online-notes-of-life",
  storageBucket: "online-notes-of-life.firebasestorage.app",
  messagingSenderId: "548624544306",
  appId: "1:548624544306:web:8892c90a9f574b5645422b",
  measurementId: "G-79JYF5NVV8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// --- DOM ELEMENTS ---
const views = {
    login: document.getElementById('login-view'),
    register: document.getElementById('register-view'),
    app: document.getElementById('app-view')
};

// State
let currentUser = null; 
let currentUserId = null; // We might use this for document IDs later

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = savedUser;
        showView('app');
    } else {
        showView('login');
    }
});

// --- NAVIGATION ---
function showView(viewName) {
    Object.values(views).forEach(el => el.classList.add('hidden'));
    views[viewName].classList.remove('hidden');

    if (viewName === 'app') {
        document.getElementById('user-display').innerText = currentUser + "'s";
        loadNotes();
    }
}

document.getElementById('show-register').onclick = () => showView('register');
document.getElementById('show-login').onclick = () => showView('login');
document.getElementById('logout-btn').onclick = () => {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showView('login');
};

// --- DATABASE FUNCTIONS (The Magic) ---

// 1. REGISTER USER
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm-password').value;
    const loading = document.getElementById('reg-loading');
    const errorMsg = document.getElementById('reg-error');

    if (password !== confirm) { alert("Passwords don't match"); return; }
    
    loading.classList.remove('hidden');
    errorMsg.classList.add('hidden');

    try {
        // Check if user exists
        const q = query(collection(db, "users"), where("username", "==", username));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            throw new Error("Username already taken!");
        }

        // Add User to Firestore
        await addDoc(collection(db, "users"), {
            username: username,
            password: password // Note: In real production apps, never store raw passwords! Use Firebase Auth.
        });

        document.getElementById('reg-success').classList.remove('hidden');
        setTimeout(() => showView('login'), 1500);

    } catch (error) {
        console.error(error);
        errorMsg.innerText = error.message;
        errorMsg.classList.remove('hidden');
    } finally {
        loading.classList.add('hidden');
    }
});

// 2. LOGIN USER
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const loading = document.getElementById('login-loading');
    const errorMsg = document.getElementById('login-error');

    loading.classList.remove('hidden');
    errorMsg.classList.add('hidden');

    try {
        const q = query(collection(db, "users"), where("username", "==", username), where("password", "==", password));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("Invalid Credentials");
        }

        currentUser = username;
        localStorage.setItem('currentUser', currentUser);
        showView('app');
        document.getElementById('login-form').reset();

    } catch (error) {
        errorMsg.classList.remove('hidden');
    } finally {
        loading.classList.add('hidden');
    }
});

// 3. ADD NOTE
document.getElementById('add-btn').onclick = async () => {
    const noteInput = document.getElementById('note-input');
    const text = noteInput.value.trim();
    if (!text) return;

    try {
        await addDoc(collection(db, "notes"), {
            text: text,
            owner: currentUser,
            createdAt: Date.now() // Helpful for sorting
        });
        noteInput.value = '';
        loadNotes(); // Reload to see new note
    } catch (e) {
        console.error("Error adding note: ", e);
        alert("Failed to save note to cloud");
    }
};

// 4. LOAD NOTES
async function loadNotes() {
    const container = document.getElementById('notes-container');
    const loadingMsg = document.getElementById('loading-notes');
    
    container.innerHTML = '';
    loadingMsg.style.display = 'block';

    try {
        const q = query(collection(db, "notes"), where("owner", "==", currentUser));
        const querySnapshot = await getDocs(q);

        if(querySnapshot.empty) {
            container.innerHTML = '<p>No notes found. Create one!</p>';
        }

        querySnapshot.forEach((docSnap) => {
            const note = docSnap.data();
            const noteId = docSnap.id; // Firestore Document ID

            const div = document.createElement('div');
            div.className = 'note';
            div.id = `note-${noteId}`;
            div.innerHTML = `
                <p id="text-${noteId}">${note.text}</p>
                <div class="note-actions">
                    <button class="note-btn btn-edit" onclick="enableEdit('${noteId}', '${note.text}')">Edit</button>
                    <button class="note-btn btn-delete" onclick="deleteCloudNote('${noteId}')">Delete</button>
                </div>
            `;
            container.appendChild(div);
        });

    } catch (e) {
        console.error("Error loading notes:", e);
    } finally {
        loadingMsg.style.display = 'none';
    }
}

// 5. DELETE NOTE
window.deleteCloudNote = async (id) => {
    if(!confirm("Delete this note permanently?")) return;
    try {
        await deleteDoc(doc(db, "notes", id));
        document.getElementById(`note-${id}`).remove();
    } catch (e) {
        console.error(e);
        alert("Delete failed");
    }
};

// 6. EDIT NOTE (UI Switch)
window.enableEdit = (id, oldText) => {
    const noteDiv = document.getElementById(`note-${id}`);
    noteDiv.innerHTML = `
        <textarea id="edit-input-${id}">${oldText}</textarea>
        <div class="note-actions">
            <button class="note-btn btn-save" onclick="saveCloudEdit('${id}')">Save</button>
            <button class="note-btn btn-cancel" onclick="loadNotes()">Cancel</button>
        </div>
    `;
};

// 7. SAVE EDITED NOTE
window.saveCloudEdit = async (id) => {
    const newText = document.getElementById(`edit-input-${id}`).value;
    try {
        const noteRef = doc(db, "notes", id);
        await updateDoc(noteRef, {
            text: newText
        });
        loadNotes();
    } catch (e) {
        console.error(e);
        alert("Update failed");
    }
};
