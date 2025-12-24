// --- DOM ELEMENTS ---
const views = {
    login: document.getElementById('login-view'),
    register: document.getElementById('register-view'),
    app: document.getElementById('app-view'),
    settings: document.getElementById('settings-view')
};

// Login/Register Forms
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const changePassForm = document.getElementById('change-pass-form');

// App Elements
const userDisplay = document.getElementById('user-display');
const notesContainer = document.getElementById('notes-container');
const noteInput = document.getElementById('note-input');

// --- STATE ---
let currentUser = null; 

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

// --- NAVIGATION & VIEW SWITCHING ---
function showView(viewName) {
    // Hide all views
    Object.values(views).forEach(el => el.classList.add('hidden'));
    
    // Show requested view
    views[viewName].classList.remove('hidden');

    if (viewName === 'app') {
        userDisplay.innerText = currentUser + "'s";
        loadNotes();
    }
}

document.getElementById('show-register').onclick = () => showView('register');
document.getElementById('show-login').onclick = () => showView('login');
document.getElementById('cancel-settings').onclick = () => showView('app');

document.getElementById('logout-btn').onclick = () => {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showView('login');
};

document.getElementById('settings-btn').onclick = () => {
    // Clear previous inputs
    changePassForm.reset(); 
    document.getElementById('settings-error').classList.add('hidden');
    document.getElementById('settings-success').classList.add('hidden');
    showView('settings');
};

// --- AUTH LOGIC (Login/Register) ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;

    const users = getDB('usersDB');
    const valid = users.find(u => u.username === user && u.password === pass);

    if (valid) {
        currentUser = user;
        localStorage.setItem('currentUser', currentUser);
        loginForm.reset();
        showView('app');
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm-password').value;

    if (pass !== confirm) return alert("Passwords do not match!");

    const users = getDB('usersDB');
    if (users.find(u => u.username === user)) return alert("User exists!");

    users.push({ username: user, password: pass });
    saveDB('usersDB', users);

    document.getElementById('reg-success').classList.remove('hidden');
    setTimeout(() => showView('login'), 1500);
});

// --- CHANGE PASSWORD LOGIC ---
changePassForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const oldPass = document.getElementById('old-password').value;
    const newPass = document.getElementById('new-password').value;
    const errorMsg = document.getElementById('settings-error');
    const successMsg = document.getElementById('settings-success');

    let users = getDB('usersDB');
    const userIndex = users.findIndex(u => u.username === currentUser);

    // Verify Old Password
    if (users[userIndex].password !== oldPass) {
        errorMsg.classList.remove('hidden');
        successMsg.classList.add('hidden');
        return;
    }

    // Update Password
    users[userIndex].password = newPass;
    saveDB('usersDB', users);

    errorMsg.classList.add('hidden');
    successMsg.classList.remove('hidden');
    setTimeout(() => showView('app'), 1500);
});

// --- NOTES LOGIC (Add, Edit, Delete) ---
document.getElementById('add-btn').onclick = () => {
    const text = noteInput.value.trim();
    if (!text) return;

    const notes = getDB('notesDB');
    notes.push({ id: Date.now(), text, owner: currentUser });
    saveDB('notesDB', notes);
    
    noteInput.value = '';
    loadNotes();
};

function loadNotes() {
    notesContainer.innerHTML = '';
    const notes = getDB('notesDB').filter(n => n.owner === currentUser);

    notes.forEach(note => {
        const div = document.createElement('div');
        div.className = 'note';
        div.id = `note-${note.id}`;
        
        // Normal View HTML
        div.innerHTML = `
            <p id="text-${note.id}">${note.text}</p>
            <div class="note-actions">
                <button class="note-btn btn-edit" onclick="enableEdit(${note.id})">Edit</button>
                <button class="note-btn btn-delete" onclick="deleteNote(${note.id})">Delete</button>
            </div>
        `;
        notesContainer.appendChild(div);
    });
}

// Global functions for onclick events
window.deleteNote = (id) => {
    if(!confirm("Are you sure?")) return;
    let notes = getDB('notesDB').filter(n => n.id !== id);
    saveDB('notesDB', notes);
    loadNotes();
};

window.enableEdit = (id) => {
    const noteDiv = document.getElementById(`note-${id}`);
    const textP = document.getElementById(`text-${id}`);
    const currentText = textP.innerText;

    // Switch to Edit Mode HTML
    noteDiv.innerHTML = `
        <textarea id="edit-input-${id}">${currentText}</textarea>
        <div class="note-actions">
            <button class="note-btn btn-save" onclick="saveEdit(${id})">Save</button>
            <button class="note-btn btn-cancel" onclick="loadNotes()">Cancel</button>
        </div>
    `;
};

window.saveEdit = (id) => {
    const newText = document.getElementById(`edit-input-${id}`).value.trim();
    if (!newText) return alert("Note cannot be empty!");

    let notes = getDB('notesDB');
    const noteIndex = notes.findIndex(n => n.id === id);
    
    if (noteIndex > -1) {
        notes[noteIndex].text = newText; // Update text
        saveDB('notesDB', notes);
        loadNotes(); // Refresh UI
    }
};

// --- HELPERS ---
function getDB(name) { return JSON.parse(localStorage.getItem(name)) || []; }
function saveDB(name, data) { localStorage.setItem(name, JSON.stringify(data)); }