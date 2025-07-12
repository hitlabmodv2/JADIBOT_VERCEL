
import fs from 'fs';
import { Wily } from '../../CODE_REPLY/reply.js';

// Fungsi untuk mendapatkan waktu Jakarta
function getJakartaTime() {
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jakarta'
    };
    return jakartaTime.toLocaleDateString('id-ID', options);
}

// Fungsi untuk validasi akses berdasarkan mode
function validateAccess(config, senderNumber) {
    const isOwner = config.OWNER.includes(senderNumber);

    // Mode SELF: hanya owner yang bisa akses
    if (config.SELF === true && !isOwner) {
        return false;
    }

    // Mode PUBLIC: semua user bisa akses
    return true;
}

// Menu Utama
export async function handleMenuCommand(m, { hisoka, command }) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const senderNumber = m.sender.split('@')[0];

        // Validasi akses
        if (!validateAccess(config, senderNumber)) {
            return; // Mode self - tidak merespon selain owner
        }

        const menuText = `
╭─── 🎯 *WILY KUN BOT* 🎯 ───╮
│
│ 🏠 *MENU UTAMA*
│
│ ◦ .menu - Menu utama
│ ◦ .menuall - Menu all
│ ◦ .menuowner - Menu owner
│ ◦ .menupublik - Menu public
│ ◦ .menureaction - Menu reaction
│
│ 📊 *BOT STATUS*
│ ◦ Mode: ${config.SELF ? 'SELF' : 'PUBLIC'}
│ ◦ Auto Online: ${config.AUTO_ONLINE ? 'ON' : 'OFF'}
│ ◦ Auto Typing: ${config.AUTO_TYPING ? 'ON' : 'OFF'}
│ ◦ Auto Record: ${config.AUTO_RECORD ? 'ON' : 'OFF'}
│ ◦ Reaction: ${config.REACTION_MODE === 'on' ? 'ON' : 'OFF'}
│
│ 💡 *INFO*
│ ${config.SELF ? '🔒 Mode SELF: Hanya untuk owner' : '🌐 Mode PUBLIC: Untuk semua user'}
│
╰─── Powered by WILY KUN ───╯
`;

        let contextInfo = {
            quotedMessage: {
                conversation: `*_Dikembangkan Oleh @Ling Xuan_* *${getJakartaTime()}*`
            },
            mentionedJid: [m.sender],
            participant: "13135550002@s.whatsapp.net",
            remoteJid: "6285787262657@g.us",
            forwardingScore: 999,
            isForwarded: true,
            externalAdReply: {
                title: "WILY KUN MENU",
                body: "Bot Menu",
                thumbnailUrl: 'https://files.catbox.moe/ezuvu4.jpg',
                sourceUrl: "https://github.com/",
                mediaType: 1,
                renderLargerThumbnail: true,
                showAdAttribution: false
            },
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363335106448800@newsletter",
                newsletterName: "Zhi Xuan Official"
            }
        };

        await hisoka.sendMessage(m.from, {
            text: menuText,
            contextInfo: contextInfo
        }, { quoted: m });

    } catch (error) {
        await Wily('❌ Terjadi kesalahan saat menampilkan menu', m, hisoka);
    }
}

// Menu Owner
export async function handleOwnerMenuCommand(m, { hisoka, command }) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const senderNumber = m.sender.split('@')[0];
        const isOwner = config.OWNER.includes(senderNumber);

        // Validasi akses berdasarkan mode
        if (!validateAccess(config, senderNumber)) {
            return; // Mode self - tidak merespon selain owner
        }

        // Di mode PUBLIC, semua user bisa melihat menu owner (tapi tidak bisa menggunakan fiturnya)
        // Di mode SELF, hanya owner yang bisa melihat menu

        const ownerMenuText = `
╭─── 👑 *OWNER MENU* 👑 ───╮
│
│ ⚙️ *BOT SETTINGS*
│ ◦ .mode [self/public] - Ubah mode bot
│ ◦ .online [on/off] - Toggle auto online
│ ◦ .typing [on/off/set] - Auto typing control
│ ◦ .record [on/off/set] - Auto record control
│ ◦ .reaction [on/off/random/matikan] - Auto reaction story
│
│ 🎭 *REACTION SETTINGS*
│ ◦ .reaction set [emoji] - Reset & set emoji (confirm)
│ ◦ .reaction add [emoji] - Tambah emoji baru
│ ◦ .reaction del [emoji] - Hapus emoji tertentu
│ ◦ .reaction delay [detik] - Set delay reaction
│ ◦ .reaction check - Diagnosa file emoji
│
│ 🛠️ *MANAGEMENT*
│ ◦ .backupsc - Backup source code bot
│
│ 📋 *CURRENT STATUS*
│ ◦ Mode: ${config.SELF ? 'SELF' : 'PUBLIC'}
│ ◦ Online: ${config.AUTO_ONLINE ? 'ON' : 'OFF'}
│ ◦ Typing: ${config.AUTO_TYPING ? 'ON' : 'OFF'}
│ ◦ Record: ${config.AUTO_RECORD ? 'ON' : 'OFF'}
│ ◦ Reaction: ${config.REACTION_MODE === 'on' ? 'ON' : 'OFF'}
│ ◦ Delay: ${config.REACTION_DELAY || 1} detik
│
│ 🔐 *ACCESS INFO*
│ ${isOwner ? '✅ Anda adalah owner - bisa menggunakan semua fitur' : '❌ Anda bukan owner - hanya bisa melihat daftar fitur'}
│
╰─── ${isOwner ? 'Owner Access Granted' : 'View Only Mode'} ───╯
`;

        let contextInfo = {
            quotedMessage: {
                conversation: `*_Dikembangkan Oleh @Ling Xuan_* *${getJakartaTime()}*`
            },
            mentionedJid: [m.sender],
            participant: "13135550002@s.whatsapp.net",
            remoteJid: "6285787262657@g.us",
            forwardingScore: 999,
            isForwarded: true,
            externalAdReply: {
                title: "OWNER MENU",
                body: "Owner Features",
                thumbnailUrl: 'https://files.catbox.moe/ezuvu4.jpg',
                sourceUrl: "https://github.com/",
                mediaType: 1,
                renderLargerThumbnail: true,
                showAdAttribution: false
            },
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363335106448800@newsletter",
                newsletterName: "Zhi Xuan Official"
            }
        };

        await hisoka.sendMessage(m.from, {
            text: ownerMenuText,
            contextInfo: contextInfo
        }, { quoted: m });

    } catch (error) {
        await Wily('❌ Terjadi kesalahan saat menampilkan owner menu', m, hisoka);
    }
}

// Menu Public
export async function handlePublicMenuCommand(m, { hisoka, command }) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const senderNumber = m.sender.split('@')[0];

        // Validasi akses
        if (!validateAccess(config, senderNumber)) {
            return; // Mode self - tidak merespon selain owner
        }

        const publicMenuText = `
╭─── 🌍 *PUBLIC MENU* 🌍 ───╮
│
│ 📧 *EMAIL TOOLS*
│ ◦ .cekmail - Cek informasi email
│
│ 💡 *INFO*
│ ◦ Fitur ini bisa digunakan semua user
│ ◦ ${config.SELF ? 'Mode SELF: Hanya untuk owner' : 'Mode PUBLIC: Untuk semua'}
│
│ 🔄 *COMING SOON*
│ ◦ Fitur lainnya sedang dikembangkan
│
╰─── Public Features ───╯
`;

        let contextInfo = {
            quotedMessage: {
                conversation: `*_Dikembangkan Oleh @Ling Xuan_* *${getJakartaTime()}*`
            },
            mentionedJid: [m.sender],
            participant: "13135550002@s.whatsapp.net",
            remoteJid: "6285787262657@g.us",
            forwardingScore: 999,
            isForwarded: true,
            externalAdReply: {
                title: "PUBLIC MENU",
                body: "Public Features",
                thumbnailUrl: 'https://files.catbox.moe/ezuvu4.jpg',
                sourceUrl: "https://github.com/",
                mediaType: 1,
                renderLargerThumbnail: true,
                showAdAttribution: false
            },
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363335106448800@newsletter",
                newsletterName: "Zhi Xuan Official"
            }
        };

        await hisoka.sendMessage(m.from, {
            text: publicMenuText,
            contextInfo: contextInfo
        }, { quoted: m });

    } catch (error) {
        await Wily('❌ Terjadi kesalahan saat menampilkan public menu', m, hisoka);
    }
}

// Menu Reaction - Menampilkan semua fitur reaction
export async function handleMenuReactionCommand(m, { hisoka, command }) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const senderNumber = m.sender.split('@')[0];
        const isOwner = config.OWNER.includes(senderNumber);

        // Validasi akses
        if (!validateAccess(config, senderNumber)) {
            return; // Mode self - tidak merespon selain owner
        }

        const menuReactionText = `
╭─── 🎭 *WILY KUN - REACTION MENU* 🎭 ───╮
│
│ 🎯 *BASIC REACTION CONTROLS*
│ ◦ .reaction - Lihat status & bantuan
│ ◦ .reaction on - Aktif (melihat & react)
│ ◦ .reaction off - Melihat saja (no react)
│ ◦ .reaction random - Random mode
│ ◦ .reaction matikan - Matikan semua
│
│ ⚙️ *EMOJI MANAGEMENT*
│ ◦ .reaction set [emoji] - Reset & ganti emoji
│ ◦ .reaction add [emoji] - Tambah emoji baru
│ ◦ .reaction del [emoji] - Hapus emoji
│
│ 🔧 *ADVANCED SETTINGS*
│ ◦ .reaction delay [detik] - Set delay reaction
│ ◦ .reaction check - Diagnosa file emoji
│
│ 📊 *CURRENT STATUS*
│ ◦ Mode: ${config.REACTION_MODE === 'on' ? '🟢 AKTIF' : config.REACTION_MODE === 'off' ? '🟡 MELIHAT SAJA' : config.REACTION_MODE === 'random' ? '🎲 RANDOM' : '🔴 DIMATIKAN'}
│ ◦ Delay: ${config.REACTION_DELAY || 1} detik
│
│ 💡 *CONTOH PENGGUNAAN*
│ ◦ .reaction set ❤️,😍,🔥 - Ganti emoji
│ ◦ .reaction add 🎉,✨,💯 - Tambah emoji
│ ◦ .reaction del 👍,😊 - Hapus emoji
│ ◦ .reaction delay 3 - Set delay 3 detik
│
│ 🔐 *ACCESS LEVEL*
│ ${isOwner ? '👑 OWNER - Full Access' : '👤 USER - View Only'}
│
│ ⚡ *MODE EXPLANATION*
│ • ON: Melihat & react semua story
│ • OFF: Hanya melihat, tidak react
│ • RANDOM: Kadang react, kadang tidak
│ • MATIKAN: Tidak melihat story sama sekali
│
╰─── Auto Story Reaction System ───╯
`;

        let contextInfo = {
            quotedMessage: {
                conversation: `*_Dikembangkan Oleh @Ling Xuan_* *${getJakartaTime()}*`
            },
            mentionedJid: [m.sender],
            participant: "13135550002@s.whatsapp.net",
            remoteJid: "6285787262657@g.us",
            forwardingScore: 999,
            isForwarded: true,
            externalAdReply: {
                title: "REACTION MENU",
                body: "Story Reaction Controls",
                thumbnailUrl: 'https://files.catbox.moe/ezuvu4.jpg',
                sourceUrl: "https://github.com/",
                mediaType: 1,
                renderLargerThumbnail: true,
                showAdAttribution: false
            },
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363335106448800@newsletter",
                newsletterName: "Zhi Xuan Official"
            }
        };

        await hisoka.sendMessage(m.from, {
            text: menuReactionText,
            contextInfo: contextInfo
        }, { quoted: m });

    } catch (error) {
        await Wily('❌ Terjadi kesalahan saat menampilkan menu reaction', m, hisoka);
    }
}

// Menu All - Menampilkan semua fitur
export async function handleMenuAllCommand(m, { hisoka, command }) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const senderNumber = m.sender.split('@')[0];
        const isOwner = config.OWNER.includes(senderNumber);

        // Validasi akses
        if (!validateAccess(config, senderNumber)) {
            return; // Mode self - tidak merespon selain owner
        }

        const menuAllText = `
╭─── 🌟 *WILY KUN - ALL FEATURES* 🌟 ───╮
│
│ 🏠 *MENU NAVIGATION*
│ ◦ .menu - Menu utama
│ ◦ .menuowner - Menu owner
│ ◦ .menupublik - Menu public
│ ◦ .menureaction - Menu reaction
│ ◦ .menuall - Semua fitur (ini)
│
│ 👑 *OWNER COMMANDS*
│ ◦ .mode [self/public] - Ubah mode bot
│ ◦ .online [on/off] - Toggle auto online
│ ◦ .typing [on/off/set] - Auto typing control
│ ◦ .record [on/off/set] - Auto record control
│ ◦ .reaction [on/off/random/matikan] - Auto reaction
│ ◦ .backupsc - Backup source code
│
│ 🎭 *REACTION ADVANCED*
│ ◦ .reaction set [emoji] - Reset & set emoji
│ ◦ .reaction add [emoji] - Tambah emoji baru
│ ◦ .reaction del [emoji] - Hapus emoji
│ ◦ .reaction delay [detik] - Set delay reaction
│ ◦ .reaction check - Diagnosa file emoji
│
│ 🌐 *PUBLIC COMMANDS*
│ ◦ .cekmail [email] - Cek informasi email
│
│ 📊 *BOT STATUS*
│ ◦ Mode: ${config.SELF ? 'SELF' : 'PUBLIC'}
│ ◦ Online: ${config.AUTO_ONLINE ? 'ON' : 'OFF'}
│ ◦ Typing: ${config.AUTO_TYPING ? 'ON' : 'OFF'}
│ ◦ Record: ${config.AUTO_RECORD ? 'ON' : 'OFF'}
│ ◦ Reaction: ${config.REACTION_MODE === 'on' ? 'ON' : 'OFF'}
│ ◦ Delay: ${config.REACTION_DELAY || 1} detik
│ ◦ Total Commands: ${isOwner ? '15+' : '4+'}
│
│ 🔐 *ACCESS LEVEL*
│ ${isOwner ? '👑 OWNER - Full Access' : '👤 USER - Limited Access'}
│
│ 💡 *COMMAND EXAMPLES*
│ ◦ .mode self - Mode hanya owner
│ ◦ .typing set 5 - Set typing 5 detik
│ ◦ .reaction add 🔥,💯,⚡ - Tambah emoji
│ ◦ .cekmail test@gmail.com - Cek email
│
╰─── Complete Feature List ───╯
`;

        let contextInfo = {
            quotedMessage: {
                conversation: `*_Dikembangkan Oleh @Ling Xuan_* *${getJakartaTime()}*`
            },
            mentionedJid: [m.sender],
            participant: "13135550002@s.whatsapp.net",
            remoteJid: "6285787262657@g.us",
            forwardingScore: 999,
            isForwarded: true,
            externalAdReply: {
                title: "ALL FEATURES MENU",
                body: "Complete Command List",
                thumbnailUrl: 'https://files.catbox.moe/ezuvu4.jpg',
                sourceUrl: "https://github.com/",
                mediaType: 1,
                renderLargerThumbnail: true,
                showAdAttribution: false
            },
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363335106448800@newsletter",
                newsletterName: "Zhi Xuan Official"
            }
        };

        await hisoka.sendMessage(m.from, {
            text: menuAllText,
            contextInfo: contextInfo
        }, { quoted: m });

    } catch (error) {
        await Wily('❌ Terjadi kesalahan saat menampilkan menu all', m, hisoka);
    }
}

// Export info untuk registrasi di message.js
export const menuInfo = {
    command: ['menu', 'bantuan'],
    description: 'Menampilkan menu utama bot'
};

export const ownerMenuInfo = {
    command: ['menuowner', 'menupemilik'],
    description: 'Menampilkan menu khusus owner'
};

export const publicMenuInfo = {
    command: ['menupublik', 'menuumum'],
    description: 'Menampilkan menu fitur public'
};

export const menuAllInfo = {
    command: ['menuall', 'allfitur'],
    description: 'Menampilkan semua fitur bot'
};

export const menuReactionInfo = {
    command: ['menureaction', 'reactionmenu'],
    description: 'Menampilkan menu khusus reaction'
};

// Export fungsi utama
export const menu = handleMenuCommand;
export const bantuan = handleMenuCommand;
export const menuowner = handleOwnerMenuCommand;
export const menupemilik = handleOwnerMenuCommand;
export const menupublik = handlePublicMenuCommand;
export const menuumum = handlePublicMenuCommand;
export const menuall = handleMenuAllCommand;
export const allfitur = handleMenuAllCommand;
export const menureaction = handleMenuReactionCommand;
export const reactionmenu = handleMenuReactionCommand;
