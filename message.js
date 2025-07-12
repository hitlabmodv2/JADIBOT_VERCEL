import { delay, jidNormalizedUser } from '@whiskeysockets/baileys';
import util from 'util';
import { exec } from 'child_process';
import fs from 'fs';

import * as Func from './lib/function.js';
import Color from './lib/color.js';
import serialize, { getContentType } from './lib/serialize.js';

// Import plugins
import { cekmail, cekmailInfo } from './WILY_KUN/PUBLIC/cekmail.js';
import { mode, modeInfo } from './WILY_KUN/OWNER/mode.js';
import { online, onlineInfo } from './WILY_KUN/OWNER/online.js';
import { typing, typingInfo } from './WILY_KUN/OWNER/typing.js';
import { record, recordInfo } from './WILY_KUN/OWNER/record.js';
import { reaction, reactionInfo, handleReactionConfirmation, handleAutoReactionStory } from './WILY_KUN/OWNER/reaction.js';
import { backupsc, backupscInfo } from './WILY_KUN/OWNER/backupsc.js';
// Import menu
import { menu, menuInfo, menuowner, ownerMenuInfo, menupublik, publicMenuInfo, menuall, menuAllInfo, menureaction, menuReactionInfo } from './WILY_KUN/LIST_MENU/menu.js';
import { runtime, runtimeInfo, ping, pingInfo } from './WILY_KUN/PUBLIC/runtime.js';

/**
 * 
 * @param {import('baileys').WASocket} hisoka 
 * @param {any} store 
 * @param {import('baileys').WAMessage} m 
 */
export default async (hisoka, store, m) => {
    try {
        // Handle auto reaction story untuk status WhatsApp
        if (m.key && m.key.remoteJid === 'status@broadcast') {
            await handleAutoReactionStory(hisoka, m);
            return; // Return setelah handle status untuk mencegah processing lebih lanjut
        }

        // Load config untuk cek mode
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

        // Cek apakah user adalah owner
        const isOwner = config.OWNER.includes(m.sender?.split('@')[0] || '');

        // Jika mode self dan bukan owner, return
        if (config.SELF === true && !isOwner) {
            return;
        }

	let quoted = m.isQuoted ? m.quoted : m;
	let downloadM = async filename => await hisoka.downloadMediaMessage(quoted, filename);
	let isCommand = (m.prefix && m.body.startsWith(m.prefix)) || false;

	// Baca config untuk auto typing
	const senderNumber = m.sender.split('@')[0];

	// mengabaikan pesan dari bot
	if (m.isBot) return;

	// Auto typing logic - jalankan secara asinkron (non-blocking)
	if (config.AUTO_TYPING && !m.isBot) {
		(async () => {
			try {
				let shouldShowTyping = false;

				// Cek apakah harus menampilkan typing
				if (config.SELF && config.mode === 'self') {
					shouldShowTyping = config.OWNER.includes(senderNumber);
				} else if (!config.SELF && config.mode === 'public') {
					shouldShowTyping = true;
				}

				if (shouldShowTyping) {
					await hisoka.sendPresenceUpdate('composing', m.from);
					await delay(config.TYPING_DURATION * 1000 || 3000);
					await hisoka.sendPresenceUpdate('paused', m.from);
				}
			} catch (error) {
				// Silent error handling untuk auto typing
			}
		})(); // IIFE - langsung dijalankan tanpa menunggu
	}

	// Auto record logic - jalankan secara asinkron (non-blocking)
	if (config.AUTO_RECORD && !m.isBot) {
		(async () => {
			try {
				let shouldShowRecord = false;

				// Cek apakah harus menampilkan record
				if (config.SELF && config.mode === 'self') {
					shouldShowRecord = config.OWNER.includes(senderNumber);
				} else if (!config.SELF && config.mode === 'public') {
					shouldShowRecord = true;
				}

				if (shouldShowRecord) {
					await hisoka.sendPresenceUpdate('recording', m.from);
					await delay(config.RECORD_DURATION * 1000 || 2000);
					await hisoka.sendPresenceUpdate('paused', m.from);
				}
			} catch (error) {
				// Silent error handling untuk auto record
			}
		})(); // IIFE - langsung dijalankan tanpa menunggu
	}

        // Handle confirmation replies for reaction commands
        if (m.quoted && m.quoted.key && m.quoted.key.id) {
            const handled = await handleReactionConfirmation(m, { hisoka });
            if (handled) {
                return; // Stop processing if confirmation was handled
            }
        }

        // Sisanya untuk handle pesan normal
        // Tambahkan handler pesan normal di sini jika diperlukan

	// Command handler
	if (isCommand) {
        // Menu command
        if (menuInfo.command.includes(m.command)) {
            await menu(m, {
                hisoka,
                text: m.text,
                command: m.command
            });
            return;
        }

        // Owner Menu command
        if (ownerMenuInfo.command.includes(m.command)) {
            await menuowner(m, {
                hisoka,
                text: m.text,
                command: m.command
            });
            return;
        }

        // Public Menu command
        if (publicMenuInfo.command.includes(m.command)) {
            await menupublik(m, {
                hisoka,
                text: m.text,
                command: m.command
            });
            return;
        }

        // Menu All command
        if (menuAllInfo.command.includes(m.command)) {
            await menuall(m, {
                hisoka,
                text: m.text,
                command: m.command
            });
            return;
        }

        // Menu Reaction command
        if (menuReactionInfo.command.includes(m.command)) {
            await menureaction(m, {
                hisoka,
                text: m.text,
                command: m.command
            });
            return;
        }

		// Mode command (owner only)
        if (modeInfo.command.includes(m.command)) {
            await mode(m, {
                hisoka,
                text: m.text,
                command: m.command
            });
            return;
        }

        // Runtime command
        if (runtimeInfo.command.includes(m.command)) {
            await runtime(m, {
                hisoka,
                text: m.text,
                command: m.command
            });
            return;
        }

        // Ping command
        if (pingInfo.command.includes(m.command)) {
            await ping(m, {
                hisoka,
                text: m.text,
                command: m.command
            });
            return;
        }

		// Online command (Owner only)
		if (onlineInfo.command.includes(m.command)) {
			// Parse argument dari body message
			const args = m.body.split(' ');
			const onlineArg = args[1] || ''; // Ambil argument setelah .online

			await online(m, { 
				hisoka, 
				text: onlineArg, // Kirim hanya argument online
				command: m.command 
			});
			return;
		}

		// Typing command (Owner only)
		if (typingInfo.command.includes(m.command)) {
			// Parse argument dari body message
			const args = m.body.split(' ');
			const typingArgs = args.slice(1).join(' '); // Ambil semua argument setelah .typing

			await typing(m, { 
				hisoka, 
				text: typingArgs, // Kirim semua argument typing
				command: m.command 
			});
			return;
		}

		// Record command (Owner only)
		if (recordInfo.command.includes(m.command)) {
			// Parse argument dari body message
			const args = m.body.split(' ');
			const recordArgs = args.slice(1).join(' '); // Ambil semua argument setelah .record

			await record(m, { 
				hisoka, 
				text: recordArgs, // Kirim semua argument record
				command: m.command 
			});
			return;
		}

		// Reaction command (Owner only)
		if (reactionInfo.command.includes(m.command)) {
			// Parse argument dari body message
			const args = m.body.split(' ');
			const reactionArgs = args.slice(1).join(' '); // Ambil semua argument setelah .reaction

			await reaction(m, { 
				hisoka, 
				text: reactionArgs, // Kirim semua argument reaction
				command: m.command 
			});
			return;
		}

		// Backup Source Code command (Owner only)
		if (backupscInfo.command.includes(m.command)) {
			await backupsc(m, { 
				hisoka, 
				text: m.text, 
				command: m.command 
			});
			return;
		}

		// Cekmail command
		if (cekmailInfo.command.includes(m.command)) {
			await cekmail(m, { 
				hisoka, 
				text: m.text, 
				command: m.command 
			});
			return;
		}
	}

    } catch (error) {
        console.error('Error in message handler:', error);
	await m.reply(util.format(error));
    }
};