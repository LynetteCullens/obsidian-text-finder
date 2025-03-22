import { App, Plugin, PluginSettingTab, Setting, MarkdownView } from 'obsidian';
import * as CodeMirror from "codemirror";
import { i18n } from "./i18n";
import { editorExtensionProvider, EditorSearch } from "./editor-extension";

// Combined settings interface
interface PluginSettings {
	// From Find and Replace in Selection
	findText: string;
	findRegexp: string;
	regexpFlags: string;
	replace: string;

	// From Text Finder
	clearAfterHidden: boolean;
	enableInputHotkeys: boolean;
	sourceModeWhenSearch: boolean;
	moveCursorToMatch: boolean;
	useSelectionAsSearch: boolean;
	useObsidianSearchInRead: boolean;
	useEscapeCharInReplace: boolean;
}

const DEFAULT_SETTINGS: PluginSettings = {
	// From Find and Replace in Selection
	findText: '',
	findRegexp: '',
	regexpFlags: '',
	replace: '',

	// From Text Finder
	clearAfterHidden: false,
	enableInputHotkeys: true,
	sourceModeWhenSearch: true,
	moveCursorToMatch: true,
	useSelectionAsSearch: true,
	useObsidianSearchInRead: true,
	useEscapeCharInReplace: true,
};

export default class CombinedTextFinderPlugin extends Plugin {
	settings: PluginSettings;
	editorSearch: EditorSearch | null = null;

	async onload() {
		await this.loadSettings();

		// Add commands from Find and Replace in Selection
		this.addCommand({
			id: 'find-and-replace-in-selection',
			name: 'Find and replace in selection',
			callback: () => this.findAndReplace()
		});

		// Add settings tab
		this.addSettingTab(new CombinedSettingTab(this.app, this));

		// Initialize editor search functionality from Text Finder
		editorExtensionProvider(this);
	}

	onunload() {
		// Clean up editor search component
		this.editorSearch?.destoryFinder();
	}

	// From Find and Replace in Selection
	findAndReplace(): void {
		let editor = this.getEditor();
		if (editor) {
			let selectedText = this.getSelectedText(editor);

			if (this.settings.findText && this.settings.findText != "") {
				selectedText = selectedText.split(this.settings.findText).join(this.settings.replace);
			}

			if (this.settings.findRegexp && this.settings.findRegexp != "") {
				var re = new RegExp(this.settings.findRegexp, this.settings.regexpFlags);
				selectedText = selectedText.replace(re, this.settings.replace);
			}

			editor.replaceSelection(selectedText);
		}
	}

	getEditor(): CodeMirror.Editor {
		return this.app.workspace.getActiveViewOfType(MarkdownView)?.sourceMode.cmEditor;
	}

	getSelectedText(editor: CodeMirror.Editor): string {
		if (!editor.somethingSelected())
			this.selectLineUnderCursor(editor);

		return editor.getSelection();
	}

	selectLineUnderCursor(editor: CodeMirror.Editor) {
		let selection = this.getLineUnderCursor(editor);
		editor.getDoc().setSelection(selection.start, selection.end);
	}

	getLineUnderCursor(editor: CodeMirror.Editor): SelectionRange {
		let fromCh, toCh: number;
		let cursor = editor.getCursor();

		fromCh = 0;
		toCh = editor.getLine(cursor.line).length;

		return {
			start: { line: cursor.line, ch: fromCh },
			end: { line: cursor.line, ch: toCh },
		};
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// Combined settings tab
class CombinedSettingTab extends PluginSettingTab {
	plugin: CombinedTextFinderPlugin;

	constructor(app: App, plugin: CombinedTextFinderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Add settings from Find and Replace in Selection
		containerEl.createEl('h2', { text: 'Find and replace in selection - Settings' });

		new Setting(containerEl)
			.setName('Text to find')
			.setDesc('Leave empty to ignore')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.findText)
				.onChange(async (value) => {
					this.plugin.settings.findText = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('RegExp to find')
			.setDesc('Leave empty to ignore')
			.addText(text => text
				.setPlaceholder('Example: (\w+)\s(\w+)')
				.setValue(this.plugin.settings.findRegexp)
				.onChange(async (value) => {
					this.plugin.settings.findRegexp = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('RegExp flags')
			.setDesc('Type "gmi" for global, multiline, insensitive')
			.addText(text => text
				.setPlaceholder('Example: gmi')
				.setValue(this.plugin.settings.regexpFlags)
				.onChange(async (value) => {
					this.plugin.settings.regexpFlags = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Replace by')
			.setDesc('Text to be inserted')
			.addText(text => text
				.setPlaceholder('Example: $2, $1')
				.setValue(this.plugin.settings.replace)
				.onChange(async (value) => {
					this.plugin.settings.replace = value;
					await this.plugin.saveSettings();
				}));

		// Add settings from Text Finder
		containerEl.createEl('h2', { text: 'Text Finder - Settings' });

		new Setting(containerEl)
			.setName(i18n.t("settings.ClearAfterHidden.name"))
			.setDesc(i18n.t("settings.ClearAfterHidden.desc"))
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.clearAfterHidden).onChange(
					async (value: boolean) => {
						this.plugin.settings.clearAfterHidden = value;
						await this.plugin.saveSettings();
					}
				);
			});

		new Setting(containerEl)
			.setName(i18n.t("settings.EnableInputHotkeys.name"))
			.setDesc(i18n.t("settings.EnableInputHotkeys.desc"))
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.enableInputHotkeys).onChange(
					async (value: boolean) => {
						this.plugin.settings.enableInputHotkeys = value;
						await this.plugin.saveSettings();
					}
				);
			});

		new Setting(containerEl)
			.setName(i18n.t("settings.SourceModeWhenSearch.name"))
			.setDesc(i18n.t("settings.SourceModeWhenSearch.desc"))
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.sourceModeWhenSearch).onChange(
					async (value: boolean) => {
						this.plugin.settings.sourceModeWhenSearch = value;
						await this.plugin.saveSettings();
					}
				);
			});

		new Setting(containerEl)
			.setName(i18n.t("settings.MoveCursorToMatch.name"))
			.setDesc(i18n.t("settings.MoveCursorToMatch.desc"))
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.moveCursorToMatch).onChange(
					async (value: boolean) => {
						this.plugin.settings.moveCursorToMatch = value;
						await this.plugin.saveSettings();
					}
				);
			});

		new Setting(containerEl)
			.setName(i18n.t("settings.UseSelectionAsSearch.name"))
			.setDesc(i18n.t("settings.UseSelectionAsSearch.desc"))
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.useSelectionAsSearch).onChange(
					async (value: boolean) => {
						this.plugin.settings.useSelectionAsSearch = value;
						await this.plugin.saveSettings();
					}
				);
			});

		new Setting(containerEl)
			.setName(i18n.t("settings.UseObsidianSearchInRead.name"))
			.setDesc(i18n.t("settings.UseObsidianSearchInRead.desc"))
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.useObsidianSearchInRead).onChange(
					async (value: boolean) => {
						this.plugin.settings.useObsidianSearchInRead = value;
						await this.plugin.saveSettings();
					}
				);
			});

		new Setting(containerEl)
			.setName(i18n.t("settings.UseEscapeCharInReplace.name"))
			.setDesc(i18n.t("settings.UseEscapeCharInReplace.desc"))
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.useEscapeCharInReplace).onChange(
					async (value: boolean) => {
						this.plugin.settings.useEscapeCharInReplace = value;
						await this.plugin.saveSettings();
					}
				);
			});
	}
}
