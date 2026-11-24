// Generate the Companion layout pages in layouts/: one page per console, with every key at its
// surface position, labelled and coloured like the physical key cap, and no actions. Import one on
// an empty page via Import / Export, then assign actions.
//
//   yarn layouts
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { KEYS, type ConsoleType, type KeyDef } from '../src/keymap.js'

/** Which key-table variants each console has, from Barco's own key table */
const CONSOLES: { file: string; name: string; types: ConsoleType[] }[] = [
	{
		file: 'layouts/ec50-layout.companionconfig',
		name: 'EC-50 layout',
		types: ['all', 'ec50', 'ec30-ec50', 'ec40-ec50'],
	},
	{ file: 'layouts/ec30-layout.companionconfig', name: 'EC-30 layout', types: ['all', 'ec30-ec50'] },
]

const WHITE = 0xffffff
const BLACK = 0x000000
const BLUE = 0x1a3fd0
const GREEN = 0x0fa03a
const RED = 0xd01818

/** Physical cap label and colour per key name. */
function cap(name: string): { text: string; color: number } {
	let m: RegExpMatchArray | null
	if ((m = name.match(/^DEST_(\d+)$/))) return { text: `Dest ${Number(m[1]) + 1}`, color: BLACK }
	if (name === 'LAYER_0') return { text: 'BG', color: BLACK }
	if ((m = name.match(/^LAYER_(\d)$/))) return { text: `${m[1]}/${Number(m[1]) + 8}`, color: BLACK }
	if ((m = name.match(/^ASSIGN_(\d)_(\d+)$/))) return { text: `A${Number(m[1]) + 1}.${Number(m[2]) + 1}`, color: BLACK }
	if ((m = name.match(/^ASSIGN_(\d)_LABEL$/))) return { text: `Row ${Number(m[1]) + 1}`, color: BLACK }
	if ((m = name.match(/^SHOW_CFG_(\d)_(\d)$/)))
		return { text: `Cfg ${Number(m[1]) + 1}.${Number(m[2]) + 1}`, color: BLACK }
	if (name.endsWith('_UP')) return { text: 'Up', color: BLACK }
	if (name.endsWith('_DOWN')) return { text: 'Down', color: BLACK }
	const fixed: Record<string, { text: string; color: number }> = {
		FREEZE_PGM: { text: 'Freeze PGM', color: BLUE },
		FREEZE_PVW: { text: 'Freeze PVW', color: BLUE },
		ARM: { text: 'Arm', color: GREEN },
		MATCH: { text: 'Match PGM', color: GREEN },
		LAYER_TRANS: { text: 'Layer Trans', color: RED },
		LAYER_CUT: { text: 'Layer Cut', color: RED },
		CUT: { text: 'Cut', color: RED },
		ALL_TRANS: { text: 'All Trans', color: RED },
	}
	return fixed[name] ?? { text: name, color: BLACK }
}

const v = <T>(value: T) => ({ value, isExpression: false })
const box = { enabled: v(true), opacity: v(100), x: v(0), y: v(0), width: v(100), height: v(100), rotation: v(0) }

/** A plain text button in Companion 5's layered format, as its own export writes it. */
function button(text: string, color: number) {
	return {
		type: 'button-layered',
		style: {
			layers: [
				{
					id: 'canvas',
					name: 'Canvas',
					usage: 'auto',
					type: 'canvas',
					decoration: v('default'),
					showStatusIcons: v('default'),
				},
				{
					id: 'box0',
					name: 'Background',
					usage: 'auto',
					type: 'box',
					...box,
					color: v(color),
					borderWidth: v(0),
					borderColor: v(0),
					borderPosition: v('inside'),
				},
				{
					id: 'text0',
					name: 'Text',
					usage: 'auto',
					type: 'text',
					...box,
					text: v(text),
					color: v(WHITE),
					halign: v('center'),
					valign: v('center'),
					fontsize: v(100),
					fontsizeAllowShrink: v(true),
					font: v('companion-sans'),
					outlineColor: v(4278190080),
				},
			],
		},
		options: {
			stepProgression: 'auto',
			stepExpression: '',
			rotaryActions: false,
			canModifyStyleInApis: false,
			notes: '',
		},
		feedbacks: [],
		steps: { 0: { action_sets: { down: [], up: [] }, options: { runWhileHeld: [] } } },
		localVariables: [],
	}
}

/** A Companion 5 page export holding one button per key */
function page(name: string, keys: KeyDef[]) {
	const controls: Record<number, Record<number, ReturnType<typeof button>>> = {}
	for (const key of keys) {
		const { text, color } = cap(key.name)
		controls[key.row] ??= {}
		controls[key.row][key.column] = button(text, color)
	}
	return {
		version: 12,
		type: 'page',
		companionBuild: '5.0.6',
		page: {
			// Derived from the name so regenerating gives the same file
			id: createHash('sha256').update(name).digest('base64url').slice(0, 21),
			name,
			controls,
			gridSize: {
				minColumn: 0,
				maxColumn: Math.max(...KEYS.map((k) => k.column)),
				minRow: 0,
				maxRow: Math.max(...KEYS.map((k) => k.row)),
			},
		},
		instances: {},
		connectionCollections: [],
		oldPageNumber: 1,
		imageLibrary: [],
		imageLibraryCollections: [],
	}
}

for (const { file, name, types } of CONSOLES) {
	const keys = KEYS.filter((k) => types.includes(k.consoleType))
	writeFileSync(file, JSON.stringify(page(name, keys), null, '\t') + '\n')
	console.log(`${keys.length} buttons written to ${file}`)
}
