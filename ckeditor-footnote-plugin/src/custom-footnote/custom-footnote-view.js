import Model from '@ckeditor/ckeditor5-ui/src/model';
import Collection from '@ckeditor/ckeditor5-utils/src/collection';

import { View, LabeledFieldView, createLabeledInputText, ButtonView, submitHandler } from '@ckeditor/ckeditor5-ui';
import { createDropdown, addListToDropdown } from '@ckeditor/ckeditor5-ui/src/dropdown/utils';
import { icons } from '@ckeditor/ckeditor5-core';

export class FormView extends View {

	constructor(locale, dropdownItems) {
		super(locale);
		this.dropdownItems = dropdownItems;

		this.dropdownView = createDropdown(locale);
		this.dropdownView.buttonView.set({
			label: 'Footnotes',
			withText: true
		});

		this._updateDropdown();

		this.saveButtonView = this._createButton('Save', icons.check, 'ck-button-save');
		this.saveButtonView.type = 'submit';

		this.cancelButtonView = this._createButton('Cancel', icons.cancel, 'ck-button-cancel');
		this.cancelButtonView.delegate('execute').to(this, 'cancel');

		this.childViews = this.createCollection([
			this.dropdownView,
			this.saveButtonView,
			this.cancelButtonView
		]);

		this.setTemplate({
			tag: 'form',
			attributes: {
				class: ['ck', 'ck-footnote-form'],
				tabindex: '-1'
			},
			children: this.childViews
		});
	}

	render() {
		super.render();
		submitHandler({ view: this });
	}

	_updateDropdown() {
		if(this.dropdownView.listView) {
			this.dropdownView.listView.items.clear();
		}

		const items = new Collection();

		items.addMany(this.dropdownItems.map(x => ({ type: 'button', model: new Model({ withText: true, label: x })})));

		addListToDropdown(this.dropdownView, items);
	}

	focus() {
		this.childViews.first.focus();
	}

	_createInput(label) {
		const labeledInput = new LabeledFieldView(this.locale, createLabeledInputText);

		labeledInput.label = label;

		return labeledInput;
	}

	_createButton(label, icon, className) {
		const button = new ButtonView();

		button.set({
			label,
			icon,
			tooltip: true,
			class: className
		});

		return button;
	}
}
