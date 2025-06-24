const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
  name: "say",
  version: "1.4.0",
  hasPermssion: 0,
  credits: "tramanhdev", // thay cre để con del có lỗ đít
  description: "Đọc văn bản bằng giọng nói FPT.AI",
  commandCategory: "Tiện ích",
  usages: "[giọng] [văn bản] hoặc reply văn bản",
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "fs-extra": ""
  }
};

// Chờ file âm thanh async sẵn sàng
async function waitForAudioReady(url, maxRetries = 10, interval = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await axios.head(url);
      if (res.status === 200) return true;
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return false;
}

module.exports.run = async function({ api, event, args }) {
  if (!args[0] && event.type !== "message_reply") {
    return api.sendMessage("📌 Vui lòng nhập nội dung hoặc reply tin nhắn để đọc.", event.threadID, event.messageID);
  }

  const supportedVoices = ["banmai", "lannhi", "myan", "thuynhan", "minhquang"];
  let voice = "banmai";
  let msg;

  // Nếu args[0] là tên giọng → lấy voice và msg
  if (args[0] && supportedVoices.includes(args[0].toLowerCase())) {
    voice = args[0].toLowerCase();
    msg = args.slice(1).join(" ");
  } else {
    msg = args.join(" ");
  }

  // Nếu là reply tin nhắn thì ưu tiên nội dung reply
  if (event.type === "message_reply") {
    msg = event.messageReply.body;
  }

  if (!msg || msg.trim().length === 0) {
    return api.sendMessage("📌 Vui lòng nhập nội dung để đọc.", event.threadID, event.messageID);
  }

  const fileName = `${event.threadID}_${event.senderID}.mp3`;
  const filePath = path.resolve(__dirname, 'cache', fileName);

  try {
    // Gửi request đến API FPT.AI
    const fptRes = await axios.post(
      'https://api.fpt.ai/hmi/tts/v5',
      msg,
      {
        headers: {
          'api-key': 'jhXzT4c0NSm4VrD3wYLL7FbcXqGpJcb1',
          'voice': voice,
          'speed': '0',
          'Content-Type': 'text/plain;charset=UTF-8'
        },
        timeout: 10000
      }
    );

    const audioUrl = fptRes.data.async;
    if (!audioUrl) throw new Error("FPT không trả về URL âm thanh");

    // Chờ URL sẵn sàng
    const ready = await waitForAudioReady(audioUrl);
    if (!ready) throw new Error("FPT.AI không tạo kịp file âm thanh.");

    // Tải file về
    const response = await axios.get(audioUrl, { responseType: 'stream', timeout: 10000 });
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on('finish', () => {
      api.sendMessage(
        {
          body: `✅ Giọng đọc: ${voice}`,
          attachment: fs.createReadStream(filePath)
        },
        event.threadID,
        () => fs.unlink(filePath),
        event.messageID
      );
    });

    writer.on('error', err => {
      console.error("❌ Lỗi ghi file:", err);
      api.sendMessage("❌ Không thể lưu file âm thanh.", event.threadID);
    });

  } catch (e) {
    console.error("❌ Lỗi xử lý TTS:", {
      message: e.message,
      data: e.response?.data,
      status: e.response?.status
    });
    return api.sendMessage("⚠️ Không thể tạo giọng nói. Vui lòng thử lại sau hoặc kiểm tra API key.", event.threadID);
  }
};