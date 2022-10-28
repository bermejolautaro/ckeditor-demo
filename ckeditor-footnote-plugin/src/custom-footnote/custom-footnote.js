import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import { ContextualBalloon, clickOutsideHandler } from '@ckeditor/ckeditor5-ui';
import { FormView } from './custom-footnote-view';
import './styles.css';

export class CustomFootnote extends Plugin {
	footnoteCount = 0;

	static get requires() {
		return [ ContextualBalloon ];
	}

    init() {
		this._defineSchema();
		this._defineConverters();

        const editor = this.editor

		this._balloon = this.editor.plugins.get(ContextualBalloon);
		this.formView = this._createFormView();

        editor.ui.componentFactory.add('custom-footnote', () => {
            const button = new ButtonView()
            button.set( {
                label: 'Footnote',
				tooltip: true,
                withText: true
            } );

            button.on( 'execute', () => {
                // Change the model using the model writer.
				this._showUI();
				const selection = editor.model.document.selection;
				const title = 'TITULO LAUCHA';

                editor.model.change( writer => {

                    // Insert the text at the user's current position.
                    editor.model.insertContent( writer.createText(this.footnoteCount + '', { superscript: title }));
					this.footnoteCount += 1;
                } );
            } );

            return button;
		})
	}

	_getFootnotes() {
		return this.editor.config._config['getFootnotes']();
	}

	_defineSchema() {
		const schema = this.editor.model.schema;

		schema.extend('$text', {
			allowAttributes: ['superscript']
		});
	}

	_defineConverters() {
		const conversion = this.editor.conversion;

		conversion.for('downcast').attributeToElement({
			model: 'superscript',
			view: (modelAttributeValue, conversionApi) => {
				const { writer } = conversionApi;

				return writer.createAttributeElement('a', {
					href: modelAttributeValue
				});
			}
		})

		conversion.for('upcast').elementToAttribute({
			view: {
				name: 'super',
				attributes: [ 'title' ]
			},
			model: {
				key: 'superscript',
				value: viewElement => {
					const title = viewElement.getAttribute('href');

					return title;
				}
			}
		})
	}

	_createFormView() {
		const editor = this.editor;
		const formView =  new FormView(this.editor.locale, this._getFootnotes());

		this.listenTo(formView, 'submit', () => {
			const footnote = formView.footnoteInputView.fieldView.element.value;
			const content = formView.contentInputView.fieldView.element.value;

			editor.model.change(writer => {
				editor.model.insertContent(writer.createText(content, { superscript: footnote }))
			});

			this._hideUI();
		})

		this.listenTo(formView, 'cancel', () => {
			this._hideUI();
		});

		clickOutsideHandler({
			emitter: formView,
			activator: () => this._balloon.visibleView === formView,
			contextElements: [ this._balloon.view.element ],
			callback: () => this._hideUI()
		});

		return formView;
	}

	_getBalloonPositionData() {
		const view = this.editor.editing.view;
		const target = () => view.domConverter.viewRangeToDom(view.document.selection.getFirstRange());

		return { target };
	}

	_showUI() {
		this._balloon.add({
			view: this.formView,
			position: this._getBalloonPositionData()
		});

		this.formView._updateDropdown();
		this.formView.focus();
	}

	_hideUI() {
		this.formView.footnoteInputView.fieldView.value = '';
		this.formView.contentInputView.fieldView.value = '';
		this.formView.element.reset();

		this._balloon.remove(this.formView);

		this.editor.editing.view.focus();
	}
}
