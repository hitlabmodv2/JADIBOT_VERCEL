
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
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
    const packname = "Image Converter";
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
                title: `🖼️ ${senderName}`,
                body: `ToImage • ${formattedDate}`,
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

async function handleToImageCommand(client, m) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';
        
        let messageText = '';
        let stickerMessage = null;
        
        // Get message text and check for sticker
        if (m.message?.conversation) {
            messageText = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            messageText = m.message.extendedTextMessage.text;
            // Check for quoted sticker
            if (m.message.extendedTextMessage.contextInfo?.quotedMessage?.stickerMessage) {
                stickerMessage = m.message.extendedTextMessage.contextInfo.quotedMessage.stickerMessage;
            }
        } else if (m.message?.stickerMessage) {
            // Direct sticker message (rare case)
            stickerMessage = m.message.stickerMessage;
            messageText = ''; // No text with direct sticker
        }
        
        // Check if it's toimg command
        const isCommand = messageText.trim() === `${prefix}toimg` || messageText.trim() === `${prefix}toimage`;
        
        if (!isCommand) return;

        // Check access control
        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe;
        
        if (!checkAccess(senderJid, config, fromMe)) {
            return; // Silent exit for unauthorized users in self mode
        }
        
        // Must have sticker
        if (!stickerMessage) {
            const helpText = `
╭━━━『 🖼️ STICKER TO IMAGE 』━━━❀
┃ 
┃ 📝 *Cara penggunaan:*
┃ 
┃ 1️⃣ Reply sticker dengan ${prefix}toimg
┃ 2️⃣ Ketik ${prefix}toimage untuk nama lengkap
┃ 
┃ 🎯 *Format yang didukung:*
┃ • Sticker WhatsApp (.webp)
┃ • Animated sticker → PNG frames
┃ • Static sticker → PNG/JPEG
┃ 
┃ 📦 *Hasil konversi:*
┃ • Format: PNG dengan transparansi
┃ • Kualitas: High Definition
┃ • Background: Dipertahankan
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Reply sticker untuk konversi ke gambar!_`;

            await ReplyRynzz(helpText, m, client);
            return;
        }

        // Send processing message
        await ReplyRynzz("⏳ Sedang mengkonversi sticker menjadi gambar...", m, client);

        // Download sticker buffer
        let stickerBuffer;
        try {
            if (m.message?.stickerMessage) {
                // Direct sticker (rare case)
                stickerBuffer = await downloadMediaMessage(m, 'buffer', {}, {});
            } else {
                // Quoted sticker (common case)
                const quotedMessage = {
                    key: m.key,
                    message: { stickerMessage: stickerMessage }
                };
                stickerBuffer = await downloadMediaMessage(quotedMessage, 'buffer', {}, {});
            }

            if (!stickerBuffer || stickerBuffer.length === 0) {
                throw new Error('Empty buffer received');
            }

        } catch (downloadError) {
            await ReplyRynzz("❌ Gagal mengunduh sticker. Pastikan reply sticker yang valid!", m, client);
            return;
        }

        // Convert using Sharp (more reliable than manual validation)
        try {
            // Sharp can handle WEBP and convert to PNG automatically
            const convertedBuffer = await sharp(stickerBuffer)
                .png({ 
                    quality: 100,
                    compressionLevel: 0,
                    adaptiveFiltering: false
                })
                .toBuffer();

            // Send converted image
            await client.sendMessage(m.key.remoteJid, {
                image: convertedBuffer,
                caption: `✅ *KONVERSI BERHASIL!*

🖼️ *Sticker → PNG Image*
📦 *Converter:* WilyKun Bot (Sharp Engine)
🎨 *Format:* PNG dengan transparansi
⚡ *Kualitas:* HD Original
🔧 *Engine:* Sharp Image Processing

💡 *Fitur:*
• Background transparan dipertahankan
• Kualitas maksimal tanpa kompresi
• Compatible dengan semua platform
• Siap untuk edit lebih lanjut

🎯 _Konversi selesai! Gambar siap digunakan!_`
            }, { quoted: m });

            // Send success stats
            const successText = `
╭━━━『 ✅ KONVERSI BERHASIL 』━━━❀
┃ 
┃ 🖼️ *Sticker berhasil dikonversi!*
┃ 📦 *Engine:* Sharp Image Processor
┃ 🎨 *Format:* WebP → PNG
┃ 📏 *Size:* ${(convertedBuffer.length / 1024).toFixed(2)} KB
┃ 
┃ 💡 *Tips selanjutnya:*
┃ • Gambar sudah terkirim di atas ⬆️
┃ • Transparansi background dipertahankan
┃ • Gunakan ${prefix}s untuk balik ke sticker
┃ • Format PNG cocok untuk editing
┃ 
┃ 🔄 *Fitur lainnya:*
┃ • ${prefix}sticker - Gambar ke sticker
┃ • ${prefix}toimg - Sticker ke gambar
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Sharp Engine - Konversi tercepat & terprecise!_`;

            await ReplyRynzz(successText, m, client);

        } catch (conversionError) {
            // Fallback: try sending original buffer if sharp fails
            try {
                await client.sendMessage(m.key.remoteJid, {
                    document: stickerBuffer,
                    fileName: 'sticker_converted.webp',
                    mimetype: 'image/webp',
                    caption: `✅ *KONVERSI FALLBACK*

🖼️ *Sticker berhasil diekstrak*
📦 *Format:* WebP Original
💡 *Note:* Dikirim sebagai file karena kompatibilitas

🎯 _Download file untuk melihat gambar!_`
                }, { quoted: m });

                await ReplyRynzz("✅ Sticker berhasil diekstrak sebagai file WebP! Download untuk melihat gambar.", m, client);

            } catch (fallbackError) {
                await ReplyRynzz("❌ Gagal mengkonversi sticker. File mungkin corrupt atau format tidak didukung.", m, client);
            }
        }

    } catch (error) {
        const errorText = `
╭━━━『 ❌ ERROR KONVERSI 』━━━❀
┃ 
┃ 💥 *Gagal mengkonversi sticker!*
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • Sticker tidak valid/corrupt
┃ • Format tidak didukung
┃ • Koneksi tidak stabil
┃ • Memory insuffcient
┃ 
┃ 💡 *Solusi:*
┃ • Coba sticker lain
┃ • Pastikan reply sticker yang benar
┃ • Restart bot jika perlu
┃ • Gunakan sticker yang lebih kecil
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Coba lagi dengan sticker yang berbeda!_`;

        await ReplyRynzz(errorText, m, client);
    }
}

module.exports = {
    handleToImageCommand,
    checkAccess,
    loadConfig
};
