import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import { ContextualBalloon, clickOutsideHandler } from '@ckeditor/ckeditor5-ui';
import { FormView } from './custom-footnote-view';
import { viewToModelPositionOutsideModelElement } from '@ckeditor/ckeditor5-widget/src/utils';
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

		const viewDocument = editor.editing.view.document;

		this.listenTo(viewDocument, 'click', () => {
			const footnote = this._getNonLinkFootnote();

			if(footnote) {
				this._toggleModal('NISADNAS');
			}
		})

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
            } );

            return button;
		})
	}

	_getNonLinkFootnote() {
		const view = this.editor.editing.view;
		const selection = view.document.selection;
		const selectedElement = selection.getSelectedElement();

		console.log(selectedElement);

		return selectedElement?.name === 'sup';
	}

	_getFootnotes() {
		return this.editor.config._config['getFootnotes']();
	}

	_toggleModal(modalText) {
		this.editor.config._config['toggleModal'](modalText);
	}

	_defineSchema() {
		const schema = this.editor.model.schema;

		schema.register('footnote-non-link', {
			inheritAllFrom: 'text',
			allowAttributes: ['footnoteNotLink'],
			isObject: true,
			isInline: true
		})

		schema.register('custom-footnote-element', {
			isObject: true,
			isInline: true,
			allowWhere: '$text',
			allowAttributes: ['footnote-count', 'footnote-content'],
			allowChildren: '$text'
		});
	}

	_defineConverters() {
		const conversion = this.editor.conversion;

		conversion.for('downcast').attributeToElement({
			model: 'footnote-non-link',
			view: (modelElement, conversionApi) => {
				const { writer } = conversionApi;
				const footnoteNotLink =  writer.createAttributeElement('sup');
				writer.setCustomProperty(footnoteNotLink, { footnoteNotLink: true });
			}
		})

		conversion.for('downcast').elementToElement({
			model: 'custom-footnote-element',
			view: (modelElement, conversionApi) => {
				const { writer } = conversionApi;
				const url = modelElement.getAttribute('footnote-content');
				const footnoteId = `${modelElement.getAttribute('footnote-count')}`;
				const result =
					writer.createContainerElement('sup', { class: 'custom-footnote-element' }, [
						writer.createContainerElement('a', { href: url, linkHref: url }, [
							writer.createText(footnoteId)
						])
					]);

				return result;
			}
		})
	}

	_createFormView() {
		const editor = this.editor;
		const formView =  new FormView(this.editor.locale, this._getFootnotes());
		let dropdownSelection = null;

		this.editor.editing.mapper.on(
            'viewToModelPosition',
            viewToModelPositionOutsideModelElement( this.editor.model, viewElement => viewElement.hasClass( 'custom-footnote-element' ) )
        );

		this.listenTo(formView.dropdownView, 'execute', evt => {
			dropdownSelection = evt.source.label
			formView.dropdownView.buttonView.label = dropdownSelection;
			editor.editing.view.focus();
		})

		this.listenTo(formView, 'submit', () => {
			if(!dropdownSelection) {
				return;
			}

			const footnoteId = `[${this.footnoteCount}]`
			const selection = this.editor.model.document.selection;

			editor.model.change(writer => {
				const footnoteElement =
					dropdownSelection.startsWith('www')
						? writer.createText(footnoteId, { superscript: true, linkHref: `http://${dropdownSelection}` })
						: writer.createText(footnoteId, { superscript: true, footnoteNotLink: true });

				editor.model.insertContent(
					footnoteElement,
					selection.getLastPosition()
				);

				writer.setSelection(footnoteElement, 'after');
			});


			this.footnoteCount += 1;
			this._hideUI();
		})

		this.listenTo(formView, 'cancel', () => {
			this._toggleModal('HELLO FROM PLUGIN')
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
		this._balloon.remove(this.formView);
		this.editor.editing.view.focus();
	}
}
