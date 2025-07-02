
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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
    const config = loadConfig();
    const packname = config?.sticker?.packname || "Stickerly2";
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
                title: `🔍 ${senderName}`,
                body: `Stickerly2 • ${formattedDate}`,
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

async function downloadAndCreateSticker(imageUrl, config) {
    try {
        const response = await axios({
            method: 'GET',
            url: imageUrl,
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const imageBuffer = Buffer.from(response.data);

        if (!imageBuffer || imageBuffer.length === 0) {
            throw new Error('Empty buffer received');
        }

        const stickerMetadata = {
            pack: config.sticker?.packname || 'WilyKun Bot',
            author: config.sticker?.author || '© WilyKun',
            type: StickerTypes.FULL,
            categories: ['🔍', '📦'],
            quality: 95
        };

        const sticker = new Sticker(imageBuffer, stickerMetadata);
        return await sticker.toBuffer();

    } catch (error) {
        throw new Error(`Failed to download/create sticker: ${error.message}`);
    }
}

async function handleStickerly2Command(client, m) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        if (!m || !m.message) {
            return false;
        }

        let messageContent = '';

        if (m.message?.conversation) {
            messageContent = m.message.conversation.trim();
        } else if (m.message?.extendedTextMessage?.text) {
            messageContent = m.message.extendedTextMessage.text.trim();
        } else if (m.message?.imageMessage?.caption) {
            messageContent = m.message.imageMessage.caption.trim();
        }

        const isCommand = messageContent.startsWith(`${prefix}stickerly2`);

        if (!isCommand) {
            return false;
        }

        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            return true; // Return true to indicate command was handled (but silently ignored)
        }

        const args = messageContent.split(' ').slice(1);
        const query = args.join(' ');

        if (!query) {
            const helpText = `
╭━━━『 🔍 STICKERLY2 DOWNLOADER 』━━━❀
┃ 
┃ 📦 *Download sticker pack dari Stickerly!*
┃ 
┃ 📝 *Cara penggunaan:*
┃ • ${prefix}stickerly2 [kata kunci]
┃ 
┃ 🎯 *Contoh lengkap:*
┃ • ${prefix}stickerly2 anime
┃   ↳ Cari dan download sticker anime
┃ 
┃ • ${prefix}stickerly2 cute cat
┃   ↳ Cari sticker kucing lucu
┃ 
┃ • ${prefix}stickerly2 meme
┃   ↳ Download sticker meme
┃ 
┃ • ${prefix}stickerly2 emoji
┃   ↳ Cari sticker emoji
┃ 
┃ 💡 *Tips pencarian yang bagus:*
┃ • Gunakan kata kunci spesifik
┃ • Coba kata dalam bahasa Inggris
┃ • Kombinasi kata: "cute cat", "anime girl"
┃ • Genre: "meme", "reaction", "emoji"
┃ 
┃ 📦 *Info sticker pack:*
┃ • Pack: ${config.sticker?.packname || 'WilyKun Bot'}
┃ • Author: ${config.sticker?.author || '© WilyKun'}
┃ • Max stickers: 10 per pack
┃ • Format: WebP sticker
┃ 
┃ ⚡ *Powered by Stickerly API*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Ketik ${prefix}stickerly2 [kata kunci] untuk mulai!_`;

            await ReplyRynzz(helpText, m, client);
            return true;
        }

        await ReplyRynzz(`🔍 *Mencari Sticker Pack...*\n\n📝 Query: "${query}"\n⏳ Sedang mencari dan download sticker...`, m, client);

        try {
            const searchRes = await axios.get(`https://zenzxz.dpdns.org/search/stickerlysearch?query=${encodeURIComponent(query)}`, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const searchJson = searchRes.data;

            if (!searchJson.status || !Array.isArray(searchJson.data) || searchJson.data.length === 0) {
                await ReplyRynzz(`❌ *Tidak Ditemukan!*\n\nTidak ada sticker pack yang ditemukan untuk: "${query}"\n\n💡 *Coba dengan kata kunci lain:*\n• Gunakan bahasa Inggris\n• Kata yang lebih umum\n• Kombinasi kata berbeda`, m, client);
                return true;
            }

            const pick = searchJson.data[Math.floor(Math.random() * searchJson.data.length)];

            const detailRes = await axios.get(`https://zenzxz.dpdns.org/tools/stickerlydetail?url=${encodeURIComponent(pick.url)}`, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const detailJson = detailRes.data;

            if (!detailJson.status || !detailJson.data || !Array.isArray(detailJson.data.stickers) || detailJson.data.stickers.length === 0) {
                await ReplyRynzz(`❌ *Error Detail!*\n\nGagal mengambil detail sticker pack\n\n💡 *Solusi:*\n• Coba kata kunci yang berbeda\n• Tunggu beberapa saat lalu coba lagi`, m, client);
                return true;
            }

            const packName = detailJson.data.name || 'Unknown Pack';
            const authorName = detailJson.data.author?.name || 'Unknown Author';
            const stickerCount = detailJson.data.stickers.length;

            const infoText = `╭━━━『 📦 DOWNLOADING PACK 』━━━❀
┃ 
┃ 📦 *${packName}*
┃ 👤 Author: ${authorName}
┃ 📊 Total: ${stickerCount} stickers
┃ 💾 Mengirim: ${Math.min(stickerCount, 10)} stickers
┃ 
┃ ⏳ *Sedang mengunduh dan mengkonversi...*
┃ 📦 Pack: ${config.sticker?.packname || 'WilyKun Bot'}
┃ ✍️ Author: ${config.sticker?.author || '© WilyKun'}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Mohon tunggu, semua sticker sedang diproses..._`;

            await ReplyRynzz(infoText, m, client);

            let successCount = 0;
            let failedCount = 0;
            const maxSend = 10;

            for (let i = 0; i < Math.min(stickerCount, maxSend); i++) {
                try {
                    const img = detailJson.data.stickers[i];
                    const stickerBuffer = await downloadAndCreateSticker(img.imageUrl, config);

                    if (stickerBuffer && stickerBuffer.length > 0) {
                        await client.sendMessage(m.key.remoteJid, {
                            sticker: stickerBuffer,
                            mimetype: 'image/webp'
                        }, { quoted: m });

                        successCount++;
                    } else {
                        failedCount++;
                    }

                    await new Promise(resolve => setTimeout(resolve, 500));

                } catch (error) {
                    failedCount++;
                }
            }

            const finalText = `╭━━━『 ✅ DOWNLOAD SELESAI 』━━━❀
┃ 
┃ 📦 *${packName}*
┃ ✅ Berhasil: ${successCount} sticker
┃ ❌ Gagal: ${failedCount} sticker
┃ 📊 Total diproses: ${Math.min(stickerCount, maxSend)} sticker
┃ 
┃ 📦 Pack: ${config.sticker?.packname || 'WilyKun Bot'}
┃ ✍️ Author: ${config.sticker?.author || '© WilyKun'}
┃ 
┃ 💡 *Sticker pack siap digunakan!*
┃ 🎯 Semua sticker telah dikirim
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Selamat menggunakan sticker pack baru!_`;

            await ReplyRynzz(finalText, m, client);
            return true;

        } catch (apiError) {
            await ReplyRynzz(`❌ *Error API!*\n\n💥 Gagal mengakses Stickerly API\n🔧 Error: ${apiError.message}\n\n💡 *Solusi:*\n• Periksa koneksi internet\n• Coba kata kunci yang berbeda\n• Tunggu beberapa saat lalu coba lagi\n• API mungkin sedang maintenance`, m, client);
            return true;
        }

    } catch (error) {
        const errorText = `
╭━━━『 ❌ SYSTEM ERROR 』━━━❀
┃ 
┃ 💥 *Terjadi kesalahan sistem!*
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • Error API Stickerly
┃ • Koneksi tidak stabil
┃ • Server overload
┃ • Format command salah
┃ 
┃ 💡 *Solusi:*
┃ • Tunggu beberapa menit
┃ • Coba command lain dulu
┃ • Periksa format command
┃ • Hubungi admin jika persist
┃ 
┃ 📝 *Format yang benar:*
┃ • ${loadConfig()?.bot?.prefix || '.'}stickerly2 [kata kunci]
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Stickerly2 API ready untuk melayani!_`;

        await ReplyRynzz(errorText, m, client);
        return true;
    }
}

// Command handler untuk ketika user ketik .qc saja
async function handleQcOnlyCommand(client, m) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        if (!m || !m.message) {
            return false;
        }

        let messageContent = '';

        if (m.message?.conversation) {
            messageContent = m.message.conversation.trim();
        } else if (m.message?.extendedTextMessage?.text) {
            messageContent = m.message.extendedTextMessage.text.trim();
        }

        // Check if user only typed .qc
        if (messageContent !== `${prefix}qc`) {
            return false;
        }

        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            return true;
        }

        const exampleText = `
╭━━━『 💬 QUOTE CREATOR EXAMPLES 』━━━❀
┃ 
┃ 🎨 *Contoh lengkap penggunaan ${prefix}qc:*
┃ 
┃ 📝 *Format Dasar:*
┃ • ${prefix}qc Halo dunia!
┃   ↳ Membuat quote dengan teks sederhana
┃ 
┃ 🎯 *Contoh Lengkap:*
┃ • ${prefix}qc Selamat pagi semua! 
┃   ↳ Quote dengan sapaan
┃ 
┃ • ${prefix}qc Hari ini adalah hari yang indah
┃   ↳ Quote motivasi
┃ 
┃ • ${prefix}qc Terima kasih atas bantuannya
┃   ↳ Quote ucapan terima kasih
┃ 
┃ • ${prefix}qc Jangan lupa bahagia hari ini 😊
┃   ↳ Quote dengan emoji
┃ 
┃ 🎨 *Fitur Quote Creator:*
┃ • Background otomatis
┃ • Font yang menarik
┃ • Nama pengirim
┃ • Tanggal otomatis
┃ • Format sticker
┃ 
┃ 💡 *Tips:*
┃ • Bisa pakai emoji 😄🎉❤️
┃ • Maksimal 150 karakter
┃ • Support bahasa Indonesia
┃ • Hasil berupa sticker
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Ketik ${prefix}qc [teks anda] untuk membuat quote!_`;

        await ReplyRynzz(exampleText, m, client);
        return true;

    } catch (error) {
        return false;
    }
}

module.exports = {
    handleStickerly2Command,
    handleQcOnlyCommand,
    checkAccess,
    loadConfig
};
