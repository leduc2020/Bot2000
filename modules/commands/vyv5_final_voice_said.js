const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { createReadStream, promises: fsPromises } = require("fs");

const banFile = path.join(__dirname, "vy_banlist.json");
let banList = [];

// Tải banList
(async () => {
  try {
    const exists = await fsPromises.access(banFile).then(() => true).catch(() => false);
    if (!exists) await fsPromises.writeFile(banFile, JSON.stringify([]));
    banList = JSON.parse(fs.readFileSync(banFile, "utf-8"));
  } catch (err) {
    console.error("Lỗi khi tải banList:", err.message);
  }
})();

function saveBanList() {
  fs.writeFileSync(banFile, JSON.stringify(banList, null, 2));
}

module.exports.config = {
  name: "vyv5",
  version: "2.3.0",
  hasPermission: 0,
  credits: "fixbychatgpt",
  description: "Vy V5 với icon, voice, phân tích ảnh, cảm xúc, ban/unban",
  commandCategory: "chat",
  usages: "[text]",
  cooldowns: 1,
};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, senderID, body, messageReply, mentions } = event;
  if (banList.includes(senderID)) return;

  // Gọi "Vy" là trả lời
  if (body?.toLowerCase().startsWith("vy")) {
    await api.setMessageReaction("⏳", messageID, threadID, true);
    return api.sendMessage("Dạ Vy nghe nè~ 💬", threadID, (err, info) => {
      if (!err) api.setMessageReaction("🥰", info.messageID, threadID, true);
    }, messageID);
  }

  // Auto cảm xúc khi người khác rep Vy
  if (messageReply?.senderID === api.getCurrentUserID()) {
    await api.setMessageReaction("⏳", messageID, threadID, true);
    let icon = "❤️";
    const lower = body.toLowerCase();
    if (/(vui|haha|cười|=+\)+|:d|thích)/.test(lower)) icon = "😄";
    else if (/(buồn|chán|khóc|tủi|huhu)/.test(lower)) icon = "😢";
    else if (/(giận|bực|cay|chửi)/.test(lower)) icon = "😠";
    else if (/(iu|yêu|thương|đáng yêu)/.test(lower)) icon = "😍";
    else if (/(sợ|hoảng|rùng mình)/.test(lower)) icon = "😨";
    api.setMessageReaction(icon, messageID, threadID, true);
  }

  // Phân tích ảnh khi rep Vy
  if (messageReply?.attachments?.length > 0 && messageReply.senderID === api.getCurrentUserID()) {
    const att = messageReply.attachments[0];
    if (att.type === "photo") {
      try {
        const image = await axios.get(att.url, { responseType: "arraybuffer" });
        const base64 = Buffer.from(image.data).toString("base64");
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI("YOUR_GEMINI_API_KEY");
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
        const result = await model.generateContent({
          contents: [{
            role: "user",
            parts: [{ text: "Mô tả ảnh sau bằng tiếng Việt:" }, {
              inlineData: { mimeType: "image/png", data: base64 }
            }]
          }]
        });
        const output = result?.response?.text?.() || "Vy không hiểu ảnh này 🥲";
        return api.sendMessage(output, threadID, messageID);
      } catch (err) {
        return api.sendMessage("Vy không phân tích được ảnh này 😢", threadID, messageID);
      }
    }
  }

  // Lệnh ban/unban/listban
  if (/^vy ban/i.test(body) && Object.keys(mentions).length > 0) {
    const ids = Object.keys(mentions);
    ids.forEach(id => { if (!banList.includes(id)) banList.push(id); });
    saveBanList();
    return api.sendMessage(`🔒 Đã ban ${ids.length} người.`, threadID, messageID);
  }
  if (/^vy unban/i.test(body) && Object.keys(mentions).length > 0) {
    const ids = Object.keys(mentions);
    banList = banList.filter(id => !ids.includes(id));
    saveBanList();
    return api.sendMessage(`🔓 Đã unban ${ids.length} người.`, threadID, messageID);
  }
  if (/^vy (listban|banlist)$/i.test(body)) {
    if (banList.length === 0) return api.sendMessage("📃 Danh sách ban trống.", threadID, messageID);
    const names = await Promise.all(
      banList.map(uid => api.getUserInfo(uid).then(res => res[uid]?.name || uid))
    );
    return api.sendMessage("📃 Danh sách ban:
" + names.map((n, i) => `${i + 1}. ${n}`).join("
"), threadID, messageID);
  }

const googleTTS = require("google-tts-api");

if (/^vy nói/i.test(body)) {
  const text = body.replace(/^vy voice/i, "").trim();
  if (!text) return api.sendMessage("Vy chưa biết nói gì nè chồng~ 😚", threadID, messageID);
  try {
    const url = googleTTS.getAudioUrl(text, { lang: "vi", slow: false, host: "https://translate.google.com" });
    const res = await axios.get(url, { responseType: "stream" });
    return api.sendMessage({
      body: "Nè chồng ơi, Vy nói nè~ 💬",
      attachment: res.data
    }, threadID, messageID);
  } catch (err) {
    return api.sendMessage("Vy không nói được đoạn này á 😢", threadID, messageID);
  }
}

};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  return api.sendMessage("Vy đây~ gọi Vy chi đó chồng? 🥰", threadID, messageID);
};
