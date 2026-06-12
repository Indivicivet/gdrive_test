const CLIENT_ID = "165388205315-k9numnp7g3qavmqi737mmar32hqvephk.apps.googleusercontent.com";

let accessToken = null;
let tokenClient = null;

const connectBtn = document.getElementById('connectBtn');
const workspace = document.getElementById('workspace');
const avatarImg = document.getElementById('avatarImg');
const avatarInput = document.getElementById('avatarInput');
const textBox = document.getElementById('textBox');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');

window.onload = () => {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (res) => {
            if (res.error) return statusDiv.textContent = res.error;
            accessToken = res.access_token;
            connectBtn.classList.add('hidden');
            workspace.classList.remove('hidden');
            loadData();
        }
    });
};

connectBtn.onclick = () => tokenClient.requestAccessToken();
avatarImg.onclick = () => avatarInput.click();

avatarInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    avatarImg.src = URL.createObjectURL(file);
    statusDiv.textContent = 'Saving avatar...';
    
    try {
        const parentId = await getOrCreateFolder('gdrive_test');
        const id = await getOrCreateFile('poc_profile_pic.png', file.type, parentId);
        if (id && await uploadContent(id, file, file.type)) {
            statusDiv.textContent = 'Avatar saved!';
        } else {
            statusDiv.textContent = 'Avatar save failed.';
        }
    } catch (err) {
        statusDiv.textContent = `Upload failed: ${err.message}`;
    }
};

saveBtn.onclick = async () => {
    statusDiv.textContent = 'Saving text...';
    const text = textBox.value;
    
    try {
        const parentId = await getOrCreateFolder('gdrive_test');
        const id = await getOrCreateFile('poc_note.txt', 'text/plain', parentId);
        if (id && await uploadContent(id, text, 'text/plain')) {
            statusDiv.textContent = 'Text saved!';
        } else {
            statusDiv.textContent = 'Text save failed.';
        }
    } catch (err) {
        statusDiv.textContent = `Save failed: ${err.message}`;
    }
};

async function loadData() {
    statusDiv.textContent = 'Loading...';
    try {
        const parentId = await getOrCreateFolder('gdrive_test');
        
        const textFile = await searchFile('poc_note.txt', parentId);
        if (textFile) {
            const res = await downloadContent(textFile.id);
            if (res) textBox.value = await res.text();
        }
        
        const avatarFile = await searchFile('poc_profile_pic.png', parentId);
        if (avatarFile) {
            const res = await downloadContent(avatarFile.id);
            if (res) avatarImg.src = URL.createObjectURL(await res.blob());
        }
        statusDiv.textContent = 'Loaded.';
    } catch (err) {
        statusDiv.textContent = `Load failed: ${err.message}`;
    }
}

async function getOrCreateFolder(name) {
    const query = encodeURIComponent(`name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await res.json();
    if (data.files && data.files.length > 0) return data.files[0].id;

    // Create the folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            mimeType: 'application/vnd.google-apps.folder'
        })
    });
    const createData = await createRes.json();
    return createData.id;
}

async function getOrCreateFile(name, mimeType, parentId) {
    const file = await searchFile(name, parentId);
    if (file) return file.id;
    
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            name: name, 
            mimeType: mimeType,
            parents: [parentId]
        })
    });
    const data = await res.json();
    return data.id;
}

async function searchFile(name, parentId) {
    const query = encodeURIComponent(`name = '${name}' and '${parentId}' in parents and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await res.json();
    return data.files?.[0];
}

async function uploadContent(fileId, content, mimeType) {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': mimeType
        },
        body: content
    });
    return res.ok;
}

async function downloadContent(fileId) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    return res.ok ? res : null;
}
