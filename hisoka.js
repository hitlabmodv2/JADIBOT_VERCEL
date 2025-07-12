import fs from 'fs';
import pkg from '@whiskeysockets/baileys';
const {
	default: makeWASocket,
	delay,
	useMultiFileAuthState,
	fetchLatestBaileysVersion,
	jidNormalizedUser,
	DisconnectReason,
	Browsers,
	makeCacheableSignalKeyStore,
} = pkg;

// Load config from JSON file
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// Try to get makeInMemoryStore, if not available create a simple alternative
const makeInMemoryStore = pkg.makeInMemoryStore || (() => {
	return {
		messages: {},
		contacts: {},
		groupMetadata: {},
		bind: () => {},
		loadMessage: () => null,
		readFromFile: () => {},
		writeToFile: () => {}
	};
});
import pino from 'pino';
import { Boom } from '@hapi/boom';
import os from 'os';
import { exec } from 'child_process';

import treeKill from './lib/tree-kill.js';
import serialize, { Client } from './lib/serialize.js';
import { formatSize, parseFileSize } from './lib/function.js';

const logger = pino({ timestamp: () => `,"time":"${new Date().toJSON()}"` }).child({ class: 'hisoka' });
logger.level = 'fatal';

let usePairingCode = null;
const store = makeInMemoryStore({ logger });

// Interactive menu for connection method
const readline = await import('readline');

const askConnectionMethod = () => {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		console.log('\n🤖 ========== PILIHAN KONEKSI BOT ========== 🤖');
		console.log('📱 1. Pairing Code → Masukkan nomor HP');
		console.log('📷 2. QR Code → Scan dengan WhatsApp');
		console.log('===============================================');
		
		rl.question('🔢 Pilih metode koneksi (1/2): ', (answer) => {
			if (answer === '1') {
				console.log('\n📱 ═══ TUTORIAL PAIRING CODE ═══');
				console.log('📋 • Siapkan nomor HP yang akan digunakan');
				console.log('🌍 • Pastikan nomor format internasional');
				console.log('✅ • Contoh: 62812345678901');
				console.log('🚫 • Jangan gunakan +, -, atau spasi');
				console.log('💡 • Awali dengan kode negara (62 untuk Indonesia)');
				console.log('═══════════════════════════════════');
				
				rl.question('📞 Masukkan nomor HP: ', (phoneNumber) => {
					usePairingCode = phoneNumber.replace(/[^0-9]/g, '');
					console.log('\n⚡ ═══ PROSES KONEKSI ═══');
					console.log(`📱 Nomor: +${usePairingCode}`);
					console.log('🔄 Sedang memproses permintaan...');
					console.log('═══════════════════════');
					rl.close();
					resolve();
				});
			} else if (answer === '2') {
				console.log('\n📷 ═══ TUTORIAL QR CODE ═══');
				console.log('📱 • Buka aplikasi WhatsApp');
				console.log('⚙️  • Ketuk ikon titik tiga (⋮) di pojok');
				console.log('🔗 • Pilih "Perangkat Tertaut"');
				console.log('➕ • Ketuk "Tautkan Perangkat"');
				console.log('📸 • Arahkan kamera ke QR Code');
				console.log('🎯 • Pastikan QR Code dalam frame');
				console.log('═══════════════════════════');
				
				usePairingCode = null;
				console.log('\n📷 Menyiapkan QR Code untuk discan...');
				rl.close();
				resolve();
			} else {
				console.log('❌ Pilihan tidak valid! Silakan pilih 1 atau 2');
				resolve(askConnectionMethod());
			}
		});
	});
};

if (config.WRITE_STORE === true) store.readFromFile(`./${config.SESSION_NAME}/store.json`);

// check available file
const pathContacts = `./${config.SESSION_NAME}/contacts.json`;
const pathMetadata = `./${config.SESSION_NAME}/groupMetadata.json`;

const validateSession = async () => {
	const sessionPath = `./${config.SESSION_NAME}`;
	const credsPath = `${sessionPath}/creds.json`;
	
	if (!fs.existsSync(credsPath)) {
		return false;
	}
	
	try {
		const credsData = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
		
		// Check if required credentials exist
		if (!credsData.me || !credsData.me.id || !credsData.signalIdentities || !credsData.registrationId) {
			console.log('❌ Session tidak valid: Data kredensial tidak lengkap');
			return false;
		}
		
		// Check if session is not corrupted
		if (Object.keys(credsData).length < 5) {
			console.log('❌ Session tidak valid: File kredensial corrupt');
			return false;
		}
		
		console.log('✅ Session valid ditemukan');
		return true;
	} catch (error) {
		console.log('❌ Session tidak valid: File kredensial corrupt atau tidak bisa dibaca');
		return false;
	}
};

const cleanupInvalidSession = async () => {
	const sessionPath = `./${config.SESSION_NAME}`;
	try {
		if (fs.existsSync(sessionPath)) {
			fs.rmSync(sessionPath, { recursive: true, force: true });
			console.log('🗑️ Session tidak valid telah dihapus');
		}
	} catch (error) {
		console.error('❌ Gagal menghapus session:', error.message);
	}
};

const startSock = async () => {
	const sessionExists = await validateSession();
	
	if (!sessionExists) {
		// Clean up invalid session and ask for connection method
		await cleanupInvalidSession();
		await askConnectionMethod();
	} else {
		console.log('⚡ Session valid - connecting...');
	}

	const { state, saveCreds } = await useMultiFileAuthState(`./${config.SESSION_NAME}`);
	const { version, isLatest } = await fetchLatestBaileysVersion();

	console.log(`📋 WA v${version.join('.')} | Latest: ${isLatest ? '✅' : '❌'}`);

	/**
	 * @type {import('baileys').WASocket}
	 */
	const hisoka = makeWASocket({
		version,
		logger,
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, logger),
		},
		browser: Browsers.ubuntu('Chrome'),
		markOnlineOnConnect: false,
		generateHighQualityLinkPreview: true,
		syncFullHistory: true,
		retryRequestDelayMs: 10,
		transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 10 },
		defaultQueryTimeoutMs: undefined,
		maxMsgRetryCount: 15,
		appStateMacVerification: {
			patch: true,
			snapshot: true,
		},
		getMessage: async key => {
			const jid = jidNormalizedUser(key.remoteJid);
			const msg = await store.loadMessage(jid, key.id);

			return msg?.message || '';
		},
		shouldSyncHistoryMessage: msg => {
			console.log(`\x1b[32mMemuat Chat [${msg.progress}%]\x1b[39m`);
			return !!msg.syncType;
		},
	});

	store.bind(hisoka.ev);
	await Client({ hisoka, store });

	// login dengan pairing
	if (usePairingCode && !hisoka.authState.creds.registered) {
		try {
			let phoneNumber = usePairingCode.replace(/[^0-9]/g, '');
			
			if (phoneNumber.length < 10) {
				console.error('❌ Nomor HP tidak valid! Minimal 10 digit');
				process.exit(1);
			}

			console.log(`\n⏳ Meminta kode pairing untuk: +${phoneNumber}`);
			console.log('🔄 Sedang menghubungi server WhatsApp...');
			await delay(3000);
			let code = await hisoka.requestPairingCode(phoneNumber);
			
			console.log('\n🎯 ═══ KODE PAIRING BERHASIL ═══');
			console.log(`🔐 KODE: \x1b[32m\x1b[1m${code?.match(/.{1,4}/g)?.join('-') || code}\x1b[39m\x1b[0m`);
			console.log('═════════════════════════════════');
			console.log('📱 CARA MEMASUKKAN KODE:');
			console.log('🚀 • Buka aplikasi WhatsApp');
			console.log('📋 • Masuk ke "Perangkat Tertaut"');
			console.log('🔗 • Pilih "Tautkan dengan nomor telepon"');
			console.log('⌨️  • Ketik kode yang ditampilkan');
			console.log('✅ • Tekan "Tautkan" untuk menyelesaikan');
			console.log('═════════════════════════════════');
		} catch (error) {
			console.error('❌ Gagal mendapatkan kode pairing:', error.message);
			process.exit(1);
		}
	}

	// ngewei info, restart or close
	hisoka.ev.on('connection.update', async update => {
		const { lastDisconnect, connection, qr } = update;
		
		// Handle QR code display
		if (qr && !usePairingCode) {
			const qrcode = await import('qrcode-terminal');
			console.log('\n📷 ═══ QR CODE TERSEDIA ═══');
			console.log('🎯 PANDUAN SCANNING:');
			console.log('📲 • Buka WhatsApp di smartphone');
			console.log('⚙️  • Akses menu pengaturan (⋮)');
			console.log('🔗 • Klik opsi "Perangkat Tertaut"');
			console.log('📸 • Gunakan fitur scan kamera');
			console.log('🎪 • Pastikan cahaya cukup terang');
			console.log('═══════════════════════════════');
			qrcode.default.generate(qr, { small: true });
			console.log('═══════════════════════════════');
			console.log('⏳ Menunggu proses scanning...');
		}
		if (connection) {
			const statusEmoji = {
				'connecting': '⚡',
				'open': '🚀',
				'close': '❌'
			};
			console.info(`${statusEmoji[connection] || '📡'} ${connection.toUpperCase()}`);
		}

		if (connection === 'close') {
			let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

			switch (reason) {
				case DisconnectReason.badSession:
					console.log('❌ Session buruk terdeteksi, membersihkan dan restart...');
					await cleanupInvalidSession();
					await startSock();
					break;
				case DisconnectReason.connectionClosed:
					console.log('⚠️ Koneksi terputus, mencoba reconnect...');
					await startSock();
					break;
				case DisconnectReason.connectionLost:
					console.log('⚠️ Koneksi hilang, mencoba reconnect...');
					await startSock();
					break;
				case DisconnectReason.restartRequired:
					console.log('🔄 Restart diperlukan...');
					await startSock();
					break;
				case DisconnectReason.timedOut:
					console.log('⏱️ Koneksi timeout, mencoba reconnect...');
					await startSock();
					break;
				case DisconnectReason.multideviceMismatch:
				case DisconnectReason.loggedOut:
				case 403:
					console.error('❌ Session tidak valid atau logout:', lastDisconnect.error?.message);
					await hisoka.logout();
					await cleanupInvalidSession();
					exec('npm run stop:pm2', err => {
						if (err) return treeKill(process.pid);
					});
					break;
				default:
					console.error('❌ Error tidak dikenal:', lastDisconnect.error?.message);
					// Validate session before restart
					const isValid = await validateSession();
					if (!isValid) {
						await cleanupInvalidSession();
					}
					await startSock();
			}
		}

		if (connection === 'open') {
			console.log(`\n🎯 Connected as: ${hisoka.user?.name}`);
			console.log(`📞 Number: ${hisoka.user?.id?.split(':')[0]}`);
			console.log('✨ Bot ready!\n');
		}
	});

	// write session kang
	hisoka.ev.on('creds.update', saveCreds);

	// contacts
	if (fs.existsSync(pathContacts)) {
		store.contacts = JSON.parse(fs.readFileSync(pathContacts, 'utf-8'));
	} else {
		fs.writeFileSync(pathContacts, JSON.stringify({}));
	}
	// group metadata
	if (fs.existsSync(pathMetadata)) {
		store.groupMetadata = JSON.parse(fs.readFileSync(pathMetadata, 'utf-8'));
	} else {
		fs.writeFileSync(pathMetadata, JSON.stringify({}));
	}

	// add contacts update to store
	hisoka.ev.on('contacts.update', update => {
		for (let contact of update) {
			let id = jidNormalizedUser(contact.id);
			if (store && store.contacts) store.contacts[id] = { ...(store.contacts?.[id] || {}), ...(contact || {}) };
		}
	});

	// add contacts upsert to store
	hisoka.ev.on('contacts.upsert', update => {
		for (let contact of update) {
			let id = jidNormalizedUser(contact.id);
			if (store && store.contacts) store.contacts[id] = { ...(contact || {}), isContact: true };
		}
	});

	// nambah perubahan grup ke store
	hisoka.ev.on('groups.update', updates => {
		for (const update of updates) {
			const id = update.id;
			if (store.groupMetadata[id]) {
				store.groupMetadata[id] = { ...(store.groupMetadata[id] || {}), ...(update || {}) };
			}
		}
	});

	// merubah status member
	hisoka.ev.on('group-participants.update', ({ id, participants, action }) => {
		const metadata = store.groupMetadata[id];
		if (metadata) {
			switch (action) {
				case 'add':
				case 'revoked_membership_requests':
					metadata.participants.push(...participants.map(id => ({ id: jidNormalizedUser(id), admin: null })));
					break;
				case 'demote':
				case 'promote':
					for (const participant of metadata.participants) {
						let id = jidNormalizedUser(participant.id);
						if (participants.includes(id)) {
							participant.admin = action === 'promote' ? 'admin' : null;
						}
					}
					break;
				case 'remove':
					metadata.participants = metadata.participants.filter(p => !participants.includes(jidNormalizedUser(p.id)));
					break;
			}
		}
	});

	// handler untuk pesan masuk
	hisoka.ev.on('messages.upsert', async ({ messages }) => {
		if (!messages[0].message) return;
		let m = await serialize(hisoka, messages[0], store);

		// nambah semua metadata ke store
		if (store.groupMetadata && Object.keys(store.groupMetadata).length === 0) store.groupMetadata = await hisoka.groupFetchAllParticipating();

		// status self apa publik - baca config real-time
		const currentConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
		if (currentConfig.SELF === true && !m.isOwner) return;

		// kanggo kes
		await (await import(`./message.js?v=${Date.now()}`)).default(hisoka, store, m);
	});

	setInterval(async () => {
		// write contacts and metadata
		if (store.groupMetadata) fs.writeFileSync(pathMetadata, JSON.stringify(store.groupMetadata));
		if (store.contacts) fs.writeFileSync(pathContacts, JSON.stringify(store.contacts));

		// write store
		if (config.WRITE_STORE === true) store.writeToFile(`./${config.SESSION_NAME}/store.json`);

		// Auto backup config - delete old backup first, then create new one
		try {
			// Delete all old backup files with timestamp
			if (fs.existsSync('./DATA')) {
				const files = fs.readdirSync('./DATA');
				files.forEach(file => {
					if (file.startsWith('config-backup-') && file.endsWith('.json') && file !== 'config-backup.json') {
						fs.unlinkSync(`./DATA/${file}`);
					}
				});
			}
			
			// Create/update single backup file
			const currentConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
			fs.writeFileSync('./DATA/config-backup.json', JSON.stringify(currentConfig, null, 2));
			
			// Apply auto online status from config
			if (currentConfig.AUTO_ONLINE === true) {
				await hisoka.sendPresenceUpdate('available');
			}
		} catch (error) {
			// Silent error handling
		}

		// untuk auto restart ketika RAM sisa 300MB
		const memoryUsage = os.totalmem() - os.freemem();

		if (memoryUsage > os.totalmem() - parseFileSize(config.AUTO_RESTART, false)) {
			await hisoka.sendMessage(
				jidNormalizedUser(hisoka.user.id),
				{ text: `penggunaan RAM mencapai *${formatSize(memoryUsage)}* waktunya merestart...` },
				{ ephemeralExpiration: 24 * 60 * 60 * 1000 }
			);
			exec('npm run restart:pm2', err => {
				if (err) return process.send('reset');
			});
		}
	}, 10 * 1000); // tiap 10 detik

	process.on('uncaughtException', console.error);
	process.on('unhandledRejection', console.error);
};

startSock();
