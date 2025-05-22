const { exec } = require("child_process");

module.exports = {
  config: {
    name: "rs",
    version: "1.0.0",
    hasPermission: 2, // Chỉ admin bot
    credits: "NgTuann",
    description: "Khởi động lại bot",
    commandCategory: "Hệ thống",
    usages: "rs",
    cooldowns: 5
  },

  run: async ({ api, event }) => {
    api.sendMessage("𝐘𝐮𝐳 đ𝐚𝐧𝐠 𝐤𝐡𝐨̛̉𝐢 đ𝐨̣̂𝐧𝐠 𝐥𝐚̣𝐢 , 𝐯𝐮𝐢 𝐥𝐨̀𝐧𝐠 𝐜𝐡𝐨̛̀", event.threadID, () => {
      process.exit(1);
    });
  },

  handleEvent: async function ({ api, event }) {
    if (!event.body || !event.isGroup) return;
    
    const body = event.body.toLowerCase().trim();
    if (body === "rs") {
      // Nếu cần kiểm tra ID admin bot thì dùng đoạn này:
      const adminBot = global.config.ADMINBOT || [];
      if (!adminBot.includes(event.senderID)) return;

      return this.run({ api, event });
    }
  }
};
