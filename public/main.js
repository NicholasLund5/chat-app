const socket = io();
const form = document.getElementById("message-form");
const usernameInput = document.getElementById("username-input");
const messageInput = document.getElementById("message-input");
const imageInput = document.getElementById("image-input");
const messages = document.getElementById("messages");
const secretPassphrase = "YourSecretPassphrase"; 

 function resizeImage(image, maxWidth, maxHeight, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
    canvas.width = image.width * ratio;
    canvas.height = image.height * ratio;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    callback(canvas.toDataURL());
}
 


form.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    const encryptedMessage = CryptoJS.AES.encrypt(message, secretPassphrase).toString();

    const username = usernameInput.value.trim() || "Anonymous";
    usernameInput.disabled = true; // No need to fetch again

    if (!message && imageInput.files.length <= 0) {
        return;
    }
    if (imageInput.files.length <= 0) {
        socket.emit("chat message", { username, message: encryptedMessage });
        messageInput.value = "";
        return
    }
    if (imageInput.files.length > 0) {
        const reader = new FileReader();
        reader.readAsDataURL(imageInput.files[0]);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                resizeImage(img, 300, 300, (resizedDataUrl) => {
                    const encryptedImage = CryptoJS.AES.encrypt(resizedDataUrl, secretPassphrase).toString();
                    socket.emit("chat message", { username, message: encryptedMessage, image: encryptedImage });
                });
            };
        };
    }

    messageInput.value = "";
    imageInput.value = "";
});

socket.on("chat message", (data) => {
    console.log("Received message:", data); 
    const { username, message, image } = data;
    const decryptedMessage = message ? CryptoJS.AES.decrypt(message, secretPassphrase).toString(CryptoJS.enc.Utf8) : null;
    let decryptedImage = null;
    if (image) {
        decryptedImage = CryptoJS.AES.decrypt(image, secretPassphrase).toString(CryptoJS.enc.Utf8);
    }
    appendMessage(username, decryptedMessage, decryptedImage);
});

const usernameColors = ['#5733FF','#33FCFF','#FF5733', '#33FF57',  '#33FFFC', '#FC33FF',  '#FFFC33', '#FC3333', '#33FFB9'];
const userColorMap = new Map();

function getUsernameColor(username) {
    if (!userColorMap.has(username)) {
        const availableColors = usernameColors.filter(color => ![...userColorMap.values()].includes(color));
        const color = availableColors.length > 0 ? availableColors[0] : 'default_color';
        userColorMap.set(username, color);
    }
    return userColorMap.get(username);
}


//update user list
function updateUserList(users) {
    const userList = document.getElementById("user-list");
    userList.innerHTML = "";
    users.forEach(user => {
        const userItem = document.createElement("li");
        const userColor = getUsernameColor(user);
        userItem.style.fontWeight = "bold";
        userItem.style.color = userColor; 

        const lineHead = document.createElement("hr");
        lineHead.style.width = "100%";
        lineHead.style.margin = "0"; 
        userList.appendChild(lineHead); 


        const nameText = document.createTextNode(user);
        userItem.appendChild(nameText);

        const lineBreak = document.createElement("br");
        userItem.appendChild(lineBreak);

        const timeSpan = document.createElement("span");
        timeSpan.style.marginLeft = "30px"; 
        timeSpan.style.fontWeight = "normal";
        timeSpan.style.color = "black";
        const currentTime = new Date().toLocaleTimeString();
        timeSpan.textContent = `Joined at ${currentTime}`;
        userItem.appendChild(timeSpan);

        userList.appendChild(userItem);

        
    });
}

socket.on("update user list", (users) => {
    updateUserList(users);
});


function appendMessage(username, message, image) {
    const item = document.createElement("div");
    item.classList.add("message");
    
    const usernameDiv = document.createElement("div");
    const color = getUsernameColor(username);
    usernameDiv.innerHTML = `<b style="border: 1px solid ${color}; padding: 8px; background-color: #CAC9C6; border-radius: 10px;">${username}</b>`;
    item.appendChild(usernameDiv);
    
    if (image) {
        const imgContainer = document.createElement("div");
        imgContainer.style.marginLeft = "40px";
    
        const img = document.createElement("img");
        img.src = image;
        img.style.borderRadius = "15px"; 
        img.style.marginTop = "20px"; 
        imgContainer.appendChild(img);
    
        item.appendChild(imgContainer);
    }
    
    if (message) {
        const messageContainer = document.createElement("div");
        messageContainer.style.marginLeft = "55px";
    
        const messageDiv = document.createElement("div");
        messageDiv.textContent = message;
        messageDiv.style.border = `.5px groove`;
        messageDiv.style.padding = "10px"; 
        messageDiv.style.backgroundColor = "#FAF3F0"; 
        messageDiv.style.borderRadius = "15px"; 
        messageDiv.style.marginTop = "20px"; 

        messageContainer.appendChild(messageDiv);
    
        item.appendChild(messageContainer);
    }
    
    messages.appendChild(item);
    
    window.scrollTo(0, document.body.scrollHeight);
}