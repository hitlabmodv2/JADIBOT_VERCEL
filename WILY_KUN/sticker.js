
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const fs = require('fs');
const path = require('path');

function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        // Silent error
    }
    return {
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' },
        sticker: { packname: 'WilyKun Bot', author: '© WilyKun' }
    };
}

function checkAccess(senderNumber, config, fromMe = false) {
    const botMode = config?.bot?.mode || 'public';

    if (botMode === 'public') {
        return true;
    }

    const botNumber = config?.bot?.botNumber;
    const ownerNumber = config?.bot?.owner;

    const cleanSender = senderNumber?.split('@')[0]?.split(':')[0];
    const cleanBot = botNumber?.split('@')[0]?.split(':')[0];
    const cleanOwner = ownerNumber?.split('@')[0]?.split(':')[0];

    const isBotNumber = cleanSender === cleanBot;
    const isOwnerNumber = cleanSender === cleanOwner;
    const isFromMe = fromMe === true;

    return isFromMe || isBotNumber || isOwnerNumber;
}

async function ReplyRynzz(teks, msg, sock) {
    const packname = "Sticker Creator";
    const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];
    const formattedDate = new Date().toLocaleDateString('id-ID');

    let profilePic;
    try {
        const userJid = msg.key.participant || msg.key.remoteJid;
        profilePic = await sock.profilePictureUrl(userJid, 'image');
    } catch (error) {
        profilePic = "https://files.catbox.moe/mxohav.gif";
    }

    const content = {
        text: teks,
        contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterName: packname,
                newsletterJid: "120363312297133690@newsletter",
            },
            externalAdReply: {
                showAdAttribution: true,
                title: `🎨 ${senderName}`,
                body: `Sticker • ${formattedDate}`,
                previewType: "IMAGE",
                thumbnailUrl: profilePic || "https://files.catbox.moe/mxohav.gif",
                sourceUrl: "https://wa.me/6289688206739",
                mediaType: 1,
                renderLargerThumbnail: false
            },
        },
    };

    return await sock.sendMessage(msg.key.remoteJid, content, { quoted: msg });
}

async function handleStickerCommand(client, m) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Validasi awal struktur message
        if (!m || !m.message) {
            return; // Skip jika message tidak valid
        }

        let messageContent = '';
        let imageMessage = null;
        let hasValidImage = false;

        // Check for image with caption FIRST (prioritas utama)
        if (m.message?.imageMessage?.caption) {
            messageContent = m.message.imageMessage.caption.trim();
            imageMessage = m.message.imageMessage;
            hasValidImage = true;
        }
        // Check for quoted image (reply)
        else if (m.message?.extendedTextMessage?.text) {
            messageContent = m.message.extendedTextMessage.text.trim();
            // Check for quoted image
            if (m.message.extendedTextMessage.contextInfo?.quotedMessage?.imageMessage) {
                imageMessage = m.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
                hasValidImage = true;
            }
        }
        // Regular text message without image
        else if (m.message?.conversation) {
            messageContent = m.message.conversation.trim();
        }

        // Check if it's sticker command
        const isCommand = messageContent === `${prefix}s` || messageContent === `${prefix}sticker`;

        if (!isCommand) {
            return; // Bukan command sticker, keluar tanpa response
        }

        // Check access based on bot mode FIRST before processing
        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            // In self mode, bot should not respond to unauthorized users
            return; // Silent exit, no response
        }

        // Must have image (either direct or quoted)
        if (!hasValidImage) {
            const helpText = `
╭━━━『 🎨 STICKER CREATOR 』━━━❀
┃ 
┃ 📝 *Cara penggunaan:*
┃ 
┃ 1️⃣ Kirim gambar dengan caption ${prefix}s
┃ 2️⃣ Reply gambar dengan ${prefix}s
┃ 3️⃣ Ketik ${prefix}sticker untuk nama lengkap
┃ 
┃ 🎯 *Format yang didukung:*
┃ • JPG, JPEG, PNG, WEBP, GIF
┃ • BMP, TIFF, SVG
┃ • Ukuran maksimal: 10MB
┃ • Resolusi optimal: 512x512px
┃ 
┃ 📦 *Info sticker pack:*
┃ • Pack: ${config.sticker?.packname || 'WilyKun Bot'}
┃ • Author: ${config.sticker?.author || '© WilyKun'}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Kirim gambar untuk membuat sticker!_`;

            await ReplyRynzz(helpText, m, client);
            return;
        }

        // Send processing message
        await ReplyRynzz("⏳ Sedang memproses gambar menjadi sticker...", m, client);

        // Download image
        let buffer;
        try {
            if (m.message?.imageMessage?.caption) {
                // Direct image with caption
                buffer = await downloadMediaMessage(m, 'buffer', {}, {});
            } else {
                // Quoted image
                const quotedMessage = {
                    key: m.key,
                    message: { imageMessage: imageMessage }
                };
                buffer = await downloadMediaMessage(quotedMessage, 'buffer', {}, {});
            }

            if (!buffer || buffer.length === 0) {
                await ReplyRynzz("❌ Gagal mengunduh gambar. Pastikan gambar valid dan tidak corrupt!", m, client);
                return;
            }

            // Enhanced image validation
            const isValidImage = 
                // JPEG
                (buffer[0] === 0xFF && buffer[1] === 0xD8) ||
                // PNG
                (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) ||
                // GIF
                (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) ||
                // WEBP
                (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && 
                 buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) ||
                // BMP
                (buffer[0] === 0x42 && buffer[1] === 0x4D);

            if (!isValidImage) {
                await ReplyRynzz("❌ Format file tidak didukung! Gunakan JPG, PNG, GIF, WEBP, atau BMP.", m, client);
                return;
            }

        } catch (downloadError) {
            console.log('❌ Download error details:', downloadError.message);

            const emergencyMsg = `
❌ *GAGAL DOWNLOAD GAMBAR*

🔧 **SOLUSI CEPAT:**
1️⃣ **Kirim ulang gambar dengan caption .s**
2️⃣ **Jangan pakai reply** (ada bug WhatsApp)
3️⃣ **Forward gambar** lalu kirim dengan caption .s

💡 **CARA YANG SELALU WORK:**
• Kirim gambar → langsung tulis .s di caption
• Ini 100% pasti berhasil!

🚀 **Tips:** Caption method lebih stabil dan cepat!`;

            await ReplyRynzz(emergencyMsg, m, client);
            return;
        }

        // Create sticker using wa-sticker-formatter
        try {
            const stickerMetadata = {
                pack: config.sticker?.packname || 'WilyKun Bot',
                author: config.sticker?.author || '© WilyKun',
                type: StickerTypes.FULL,
                categories: ['🤖'],
                quality: 95,
                background: 'transparent'
            };

            const sticker = new Sticker(buffer, stickerMetadata);
            const stickerBuffer = await sticker.toBuffer();

            if (!stickerBuffer || stickerBuffer.length === 0) {
                await ReplyRynzz("❌ Gagal membuat sticker. Format gambar mungkin tidak kompatibel.", m, client);
                return;
            }

            // Send sticker
            await client.sendMessage(m.key.remoteJid, {
                sticker: stickerBuffer,
                mimetype: 'image/webp'
            }, { quoted: m });

            // Send success message
            const successText = `
╭━━━『 ✅ STICKER BERHASIL 』━━━❀
┃ 
┃ 🎨 *Sticker berhasil dibuat!*
┃ 📦 Pack: ${stickerMetadata.pack}
┃ ✍️ Author: ${stickerMetadata.author}
┃ 
┃ 💡 *Tips:*
┃ • Gunakan gambar dengan background transparan untuk hasil terbaik
┃ • Ukuran optimal: 512x512px
┃ • Format terbaik: PNG dengan background transparan
┃ • Semua format gambar didukung (JPG, PNG, GIF, WEBP, BMP)
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Selamat menggunakan sticker baru!_`;

            await ReplyRynzz(successText, m, client);

        } catch (stickerError) {
            await ReplyRynzz("❌ Gagal membuat sticker. Pastikan gambar tidak corrupt dan ukuran tidak terlalu besar!", m, client);
        }

    } catch (error) {
        const errorText = `
╭━━━『 ❌ ERROR STICKER 』━━━❀
┃ 
┃ 💥 *Gagal membuat sticker!*
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • Format gambar tidak didukung
┃ • Ukuran file terlalu besar (>10MB)
┃ • File gambar corrupt atau rusak
┃ • Koneksi tidak stabil
┃ 
┃ 💡 *Solusi:*
┃ • Coba dengan gambar lain
┃ • Pastikan ukuran < 10MB
┃ • Gunakan format JPG/PNG/GIF/WEBP
┃ • Periksa koneksi internet
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Silakan coba lagi dengan gambar yang berbeda!_`;

        await ReplyRynzz(errorText, m, client);
    }
}

module.exports = {
    handleStickerCommand,
    checkAccess,
    loadConfig
};
