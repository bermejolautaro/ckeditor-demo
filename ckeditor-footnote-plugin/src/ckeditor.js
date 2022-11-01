/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md.
 */

// The editor creator to use.
import ClassicEditorBase from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';

import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials';
import UploadAdapter from '@ckeditor/ckeditor5-adapter-ckfinder/src/uploadadapter';
import Autoformat from '@ckeditor/ckeditor5-autoformat/src/autoformat';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
import Superscript from '@ckeditor/ckeditor5-basic-styles/src/superscript';
import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic';
import BlockQuote from '@ckeditor/ckeditor5-block-quote/src/blockquote';
import CKFinder from '@ckeditor/ckeditor5-ckfinder/src/ckfinder';
import EasyImage from '@ckeditor/ckeditor5-easy-image/src/easyimage';
import Heading from '@ckeditor/ckeditor5-heading/src/heading';
import Image from '@ckeditor/ckeditor5-image/src/image';
import ImageCaption from '@ckeditor/ckeditor5-image/src/imagecaption';
import ImageStyle from '@ckeditor/ckeditor5-image/src/imagestyle';
import ImageToolbar from '@ckeditor/ckeditor5-image/src/imagetoolbar';
import ImageUpload from '@ckeditor/ckeditor5-image/src/imageupload';
import Indent from '@ckeditor/ckeditor5-indent/src/indent';
import Link from '@ckeditor/ckeditor5-link/src/link';
import List from '@ckeditor/ckeditor5-list/src/list';
import MediaEmbed from '@ckeditor/ckeditor5-media-embed/src/mediaembed';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import PasteFromOffice from '@ckeditor/ckeditor5-paste-from-office/src/pastefromoffice';
import Table from '@ckeditor/ckeditor5-table/src/table';
import TableToolbar from '@ckeditor/ckeditor5-table/src/tabletoolbar';
import CloudServices from '@ckeditor/ckeditor5-cloud-services/src/cloudservices';

import Context from '@ckeditor/ckeditor5-core/src/context';
import ContextWatchdog from '@ckeditor/ckeditor5-watchdog/src/contextwatchdog';

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Command from '@ckeditor/ckeditor5-core/src/command';
import { toWidget, toWidgetEditable, viewToModelPositionOutsideModelElement } from '@ckeditor/ckeditor5-widget/src/utils';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';
import pilcrowIcon from '@ckeditor/ckeditor5-core/theme/icons/pilcrow.svg';
import { addListToDropdown, createDropdown } from '@ckeditor/ckeditor5-ui/src/dropdown/utils';
import Collection from '@ckeditor/ckeditor5-utils/src/collection';
import Model from '@ckeditor/ckeditor5-ui/src/model';
import { CustomFootnote } from './custom-footnote/custom-footnote';

class InsertFootNoteCommand extends Command {
    execute( { value } ) {
        const doc = this.editor.model.document;
        if (doc.getRoot().getChild(doc.getRoot().maxOffset - 1).name !== 'footNote') {
            this.editor.model.change( writer => {
                this.editor.model.insertContent( createFootNote( writer ), writer.createPositionAt( doc.getRoot(), doc.getRoot().maxOffset ));
            } );
        }
        else {
            if ( value !== 0 ) {
                this.editor.model.change( writer => {
                    const noteholder = writer.createElement( 'noteHolder', { id: value } );
                    this.editor.model.insertContent( noteholder );
                    writer.setSelection( noteholder, 'on' );
                } );
            }
            else {
                this.editor.model.change( writer => {
                    const footNote = doc.getRoot().getChild(doc.getRoot().maxOffset - 1);
                    const footNoteList = writer.createElement( 'footNoteList' );
                    const footNoteItem = writer.createElement( 'footNoteItem', { id: footNote.maxOffset } );
                    const p = writer.createElement( 'paragraph' );
                    writer.append( footNoteItem, p );
                    writer.append( p, footNoteList ) ;

                    this.editor.model.insertContent( footNoteList, writer.createPositionAt( footNote, footNote.maxOffset ));
                } );
            }
        }
    }

    refresh() {
        const model = this.editor.model;
        const selection = model.document.selection;
        const allowedIn = model.schema.findAllowedParent( selection.getLastPosition(), 'footNote' );
        this.isEnabled = allowedIn !== null;
    }
}

function createFootNote( writer ) {
    const footNote = writer.createElement( 'footNote' );
    const footNoteTitle = writer.createElement( 'footNoteTitle' );
    const footNoteList = writer.createElement( 'footNoteList' );
    const footNoteItem = writer.createElement( 'footNoteItem', { id: 1 } );
    const p = writer.createElement( 'paragraph');

    writer.append( footNoteTitle, footNote );
    writer.append( footNoteList, footNote );
    writer.append( footNoteItem, p ) ;
    writer.append( p, footNoteList );

    // There must be at least one paragraph for the description to be editable.
    // See https://github.com/ckeditor/ckeditor5/issues/1464.
    //writer.appendElement( 'paragraph', footNoteList );

    return footNote;
}


class FootNoteUI extends Plugin {
    init() {
        const editor = this.editor;
        const t = editor.t;
        const doc = this.editor.model.document;

        this.editor.ui.componentFactory.add( 'footnote', locale => {
            const dropdownView = createDropdown( locale );

            // Populate the list in the dropdown with items.
            // addListToDropdown( dropdownView, getDropdownItemsDefinitions( placeholderNames ) );
            const command = editor.commands.get( 'InsertFootnote' );

            dropdownView.buttonView.set( {
                label: t( 'Footnote' ),
                icon: pilcrowIcon,
                tooltip: true
            } );

            dropdownView.class = 'ck-code-block-dropdown';
            dropdownView.bind( 'isEnabled' ).to( command );
            dropdownView.on('change:isOpen', ( evt, propertyName, newValue, oldValue ) => {
                if ( newValue ) {
                    addListToDropdown( dropdownView, getDropdownItemsDefinitions( doc, dropdownView ) );
                }
                else {
                    dropdownView.listView.items.clear();
                }
            } );
            // Execute the command when the dropdown item is clicked (executed).
            this.listenTo( dropdownView, 'execute', evt => {
                editor.execute( 'InsertFootnote', { value: evt.source.commandParam } );
                editor.editing.view.focus();
            } );

            return dropdownView;
        } );

    }
}

function getDropdownItemsDefinitions( doc ) {
    const itemDefinitions = new Collection();
    const defaultDef = {
        type: 'button',
        model: new Model( {
            commandParam: 0,
            label: 'New footnote',
            withText: true
        } )
    }
    itemDefinitions.add( defaultDef );

    if (doc.getRoot().getChild(doc.getRoot().maxOffset - 1).name === 'footNote') {
            const footNote = doc.getRoot().getChild(doc.getRoot().maxOffset - 1);
            for (var i = 0; i < footNote.maxOffset - 1; i ++) {
                const definition = {
                    type: 'button',
                    model: new Model( {
                        commandParam: i + 1,
                        label: 'Insert footnote ' + (i + 1),
                        withText: true
                    } )
                };

                // Add the item definition to the collection.
                itemDefinitions.add( definition );
            }
        }

    return itemDefinitions;
}

class FootNoteEditing extends Plugin {
    static get requires() {
        return [ Widget ];
    }

    init() {
        this._defineSchema();
        this._defineConverters();

        this.editor.commands.add( 'InsertFootnote', new InsertFootNoteCommand( this.editor ) );

        this._deleteModify();

        this.editor.editing.mapper.on(
            'viewToModelPosition',
            viewToModelPositionOutsideModelElement( this.editor.model, viewElement => viewElement.hasClass( 'noteholder' ) )
        );
        this.editor.editing.mapper.on(
            'viewToModelPosition',
            viewToModelPositionOutsideModelElement( this.editor.model, viewElement => viewElement.hasClass( 'footnote-item' ) )
        );
    }

    _deleteModify() {
        const viewDocument = this.editor.editing.view.document;
        const editor = this.editor;
        this.listenTo( viewDocument, 'delete', ( evt, data ) => {
            const doc = editor.model.document;
            const deleteEle = doc.selection.getSelectedElement();
            const positionParent = doc.selection.getLastPosition().parent;
            console.log(deleteEle);

            if (deleteEle !== null && deleteEle.name === "footNote") {
                console.log(1)
                removeHoder(editor, 0);
            }

            if (positionParent.name === "$root") {
                return
            }


            if (positionParent.parent.name !== "footNoteList") {
                return
            }

            if (positionParent.maxOffset > 1 && doc.selection.anchor.offset <= 1) {
                console.log(evt);
                console.log(data);
                data.preventDefault();
                evt.stop();
            }

            if ((doc.selection.anchor.offset === 0 && positionParent.maxOffset === 1) || (positionParent.maxOffset === doc.selection.anchor.offset && doc.selection.focus.offset === 0)) {
                const footNoteList = positionParent.parent;
                const index = footNoteList.index;
                const footNote = footNoteList.parent;
                for (var i = index + 1; i < footNote.maxOffset; i ++) {
                        editor.model.change( writer => {
                            writer.setAttribute( 'id', i - 1, footNote.getChild( i ).getChild( 0 ).getChild( 0 ) );
                        } );
                    }
                removeHoder(editor, index);
                editor.model.change( writer => {
                    if (index === 1) {
                        if (footNote.childCount === 2) {
                            if (footNote.previousSibling === null) {
                                const p = writer.createElement( 'paragraph' );
                                this.editor.model.insertContent( p, writer.createPositionAt( doc.getRoot(), 0 ));
                                writer.setSelection( p, 'end' );
                                }
                            else {
                                writer.setSelection( footNote.previousSibling, 'end'  );
                            }
                            writer.remove(footNote);
                        }
                        else {
                            writer.setSelection( footNoteList.nextSibling, 'end' );
                        }
                    }
                    else {
                        writer.setSelection( footNoteList.previousSibling, 'end' );
                    }
                    writer.remove(footNoteList);
                } );
                data.preventDefault();
                evt.stop();

            }
        } , { priority: 'high' });
        /*
        this.editor.model.on( 'deleteContent', () => {
            const editor = this.editor;
            const changes = editor.model.document.differ.getChanges();
            changes.forEach( function(item, index) {
                if (item.type === 'remove' && item.name === 'footNote') {
                    removeHoder(editor, 0);
                }

                if (item.type === 'remove' && item.name === 'footNoteList') {
                    const footNote = item.position.parent;
                    const index = (changes[0].type === 'insert' && changes[0].name === 'footNoteItem') ?
                                    1 : item.position.path[1];
                    for (var i = index; i < footNote.maxOffset; i ++) {
                        editor.model.change( writer => {
                            writer.setAttribute( 'id', i, footNote.getChild( i ).getChild( 0 ).getChild( 0 ) );
                        } );
                    }
                    removeHoder(editor, index);

                }
            } );
        });*/
    }

    _defineSchema() {
        const schema = this.editor.model.schema;

        /***********************************Footnote Section Schema***************************************/
        schema.register( 'footNote', {
            isObject: true,
            allowWhere: '$block',
        } );

        schema.register( 'footNoteTitle', {
            allowIn: 'footNote',
            allowContentOf: '$text',
        });

        schema.register( 'footNoteList', {
            allowIn: 'footNote',
            allowContentOf: '$root',
            isInline: true,
        });

        schema.register( 'footNoteItem', {
            allowIn: 'footNoteList',
            allowWhere: '$text',
            isInline: true,
            isObject: true,
            allowAttributes: [ 'id' ]
        });

        schema.addChildCheck( ( context, childDefinition ) => {
            if ( context.endsWith( 'footNoteList' ) && childDefinition.name === 'footNote' ) {
                return false;
            }
        } );

        /***********************************Footnote Inline Schema***************************************/
        schema.register( 'noteHolder', {
            allowWhere: '$text',
            isInline: true,
            isObject: true,
            allowAttributes: [ 'id' ]
        } );
    }

    _defineConverters() {
        const editor = this.editor;
        const conversion = editor.conversion;

        /***********************************Footnote Section Conversion************************************/
        // ((data) view → model)
        conversion.for( 'upcast' ).elementToElement( {
            view: {
                name: 'section',
                classes: 'footnote'
            },
            model: ( viewElement, modelWriter ) => {
                const FootNote = modelWriter.createElement( 'footNote' );
                return FootNote;
            }

        } );

        // (model → data view)
        conversion.for( 'dataDowncast' ).elementToElement( {
            model: 'footNote',
            view: {
                name: 'section',
                classes: 'footnote'
            }
        } );

        // (model → editing view)
        conversion.for( 'editingDowncast' ).elementToElement( {
            model: 'footNote',
            view: ( modelElement, viewWriter ) => {
                const section = viewWriter.createContainerElement( 'section', { class: 'footnote' } );

                return toWidget( section, viewWriter, { label: 'footnote widget' } );
            }
        } );

        /***********************************Footnote Title Conversion************************************/

        conversion.for( 'upcast' ).elementToElement( {
            model: 'footNoteTitle',
            view: {
                name: 'h3',
                classes: 'footnote-title',
                style: "display: inline;"
            }
        } );

        conversion.for( 'dataDowncast' ).elementToElement( {
            model: 'footNoteTitle',
            view: createTitleView
        } );

        conversion.for( 'editingDowncast' ).elementToElement( {
            model: 'footNoteTitle',
            view: ( modelElement, viewWriter ) => {
                const widgetElement = createTitleView( modelElement, viewWriter );
                return toWidget( widgetElement, viewWriter );
            }
        } );

        function createTitleView( modelElement, viewWriter ) {
            const titleView = viewWriter.createContainerElement( 'h3', {
                class: 'footnote-title',
                style: "display: inline;"
            } );

            const innerText = viewWriter.createText( 'Footnotes:' );
            viewWriter.insert( viewWriter.createPositionAt( titleView, 0 ), innerText );

            return titleView;
        }

        /***********************************Footnote List Conversion************************************/

        conversion.for( 'upcast' ).elementToElement( {
            model: ( viewElement, modelWriter ) => {
                return modelWriter.createElement( 'footNoteList' );
            },
            view: {
                name: 'section',
                classes: 'footnote-list'
            }
        } );

        conversion.for( 'dataDowncast' ).elementToElement( {
            model: 'footNoteList',
            view: {
                name: 'section',
                classes: 'footnote-list'
            }
        } );

        conversion.for( 'editingDowncast' ).elementToElement( {
            model: 'footNoteList',
            view: ( modelElement, viewWriter ) => {
                // Note: You use a more specialized createEditableElement() method here.
                const section = viewWriter.createEditableElement( 'section', { class: 'footnote-list' } );

                return toWidgetEditable( section, viewWriter );
            }
        } );

        /***********************************Footnote Item Conversion************************************/

        conversion.for( 'upcast' ).elementToElement( {
            view: {
                name: 'span',
                classes: 'footnote-item'
            },
            model: ( viewElement, modelWriter ) => {
                // Extract the "name" from "{name}".
                const id = viewElement.getChild( 0 ).data.slice( 0, -2 );

                return modelWriter.createElement( 'footNoteItem', { id } );
            }
        } );

        conversion.for( 'dataDowncast' ).elementToElement( {
            model: 'footNoteItem',
            view: createItemView
        } );

        conversion.for( 'editingDowncast' ).elementToElement( {
            model: 'footNoteItem',
            view: ( modelElement, viewWriter ) => {
                // Note: You use a more specialized createEditableElement() method here.
                const section = createItemView( modelElement, viewWriter );
                return toWidget( section, viewWriter );
            }
        } );

        function createItemView( modelElement, viewWriter ) {

            const id = modelElement.getAttribute( 'id' );
            const itemView = viewWriter.createContainerElement( 'span', {
                class: 'footnote-item'
            } );

            const innerText = viewWriter.createText( id + '. ' );
            viewWriter.insert( viewWriter.createPositionAt( itemView, 0 ), innerText );

            return itemView;
        }

        /***********************************Footnote Inline Conversion************************************/

        conversion.for( 'upcast' ).elementToElement( {
            view: {
                name: 'span',
                classes: [ 'noteholder' ]
            },
            model: ( viewElement, modelWriter ) => {
                // Extract the "id" from "[id]".
                const id = viewElement.getChild( 0 ).getChild( 0 ).data.slice( 1, -1 );

                return modelWriter.createElement( 'noteHolder', { id } );
            }
        } );

        conversion.for( 'editingDowncast' ).elementToElement( {
            model: 'noteHolder',
            view: ( modelElement, viewWriter ) => {
                const widgetElement = createPlaceholderView( modelElement, viewWriter );

                // Enable widget handling on a placeholder element inside the editing view.
                return toWidget( widgetElement, viewWriter );
            }
        } );

        conversion.for( 'dataDowncast' ).elementToElement( {
            model: 'noteHolder',
            view: createPlaceholderView
        } );

        // Helper method for both downcast converters.
        function createPlaceholderView( modelElement, viewWriter ) {
            const id = modelElement.getAttribute( 'id' );

            const placeholderView = viewWriter.createContainerElement( 'span', {
                class: 'noteholder'
            } );

            // Insert the placeholder name (as a text).
            const innerText = viewWriter.createText( '[' + id + ']' );
            const sup = viewWriter.createContainerElement( 'sup' );
            viewWriter.insert( viewWriter.createPositionAt( sup, 0 ), innerText );
            viewWriter.insert( viewWriter.createPositionAt( placeholderView, 0 ), sup );

            return placeholderView;
        }

        conversion.for( 'editingDowncast' )
        .add( dispatcher => {
            dispatcher.on( 'attribute:id:footNoteItem', modelViewChangeItem, { priority: 'high' } );
            dispatcher.on( 'attribute:id:noteHolder', modelViewChangeHolder, { priority: 'high' } );
        } );
    }
}

export function modelViewChangeItem( evt, data, conversionApi ) {
    if ( !conversionApi.consumable.consume( data.item, 'attribute:id:footNoteItem' ) ) {
        return;
    }
    if (data.attributeOldValue === null) {
        return;
    }

    const itemView = conversionApi.mapper.toViewElement( data.item );
    const viewWriter = conversionApi.writer;

    viewWriter.remove(itemView.getChild( 0 ));

    const innerText = viewWriter.createText( data.attributeNewValue + '. ' );
    viewWriter.insert( viewWriter.createPositionAt( itemView, 0 ), innerText );

}

export function modelViewChangeHolder( evt, data, conversionApi ) {
    if ( !conversionApi.consumable.consume( data.item, 'attribute:id:noteHolder' ) ) {
        return;
    }
    if (data.attributeOldValue === null) {
        return;
    }

    const itemView = conversionApi.mapper.toViewElement( data.item );
    const viewWriter = conversionApi.writer;

    viewWriter.remove(itemView.getChild( 0 ).getChild( 0 ));

    const innerText = viewWriter.createText( '[' + data.attributeNewValue + ']' );
    viewWriter.insert( viewWriter.createPositionAt( itemView.getChild( 0 ), 0 ), innerText );

}

function removeHoder(editor, index) {
    const removeList = [];
    const range = editor.model.createRangeIn( editor.model.document.getRoot() );
    for ( const value of range.getWalker( { ignoreElementEnd: true } ) ) {
        if (value.item.name === 'noteHolder') {
            if (parseInt(value.item.getAttribute('id')) === index || index === 0) {
                removeList.push(value.item);
            }
            else if (parseInt(value.item.getAttribute('id')) > index) {
                editor.model.change( writer => {
                    writer.setAttribute( 'id', parseInt(value.item.getAttribute('id')) - 1, value.item );
                } );
            }
        }
    }
    for (const item of removeList) {
        editor.model.change( writer => {
            writer.remove( item );
        } );
    }
}

class FootNote extends Plugin {
    static get requires() {
        return [ FootNoteEditing, FootNoteUI ];
    }
}

class ClassicEditor extends ClassicEditorBase {}

// Plugins to include in the build.
ClassicEditor.builtinPlugins = [
	CustomFootnote,
	Autoformat,
	BlockQuote,
	Bold,
	CKFinder,
	CloudServices,
	EasyImage,
	Essentials,
	Heading,
	Image,
	ImageCaption,
	ImageStyle,
	ImageToolbar,
	ImageUpload,
	Indent,
	Italic,
	Link,
	List,
	MediaEmbed,
	Paragraph,
	PasteFromOffice,
	Table,
	TableToolbar,
	UploadAdapter,
	Superscript
];

// Editor configuration.
ClassicEditor.defaultConfig = {
	toolbar: {
		items: [
			'custom-footnote',
			'heading',
			'|',
			'superscript',
			'bold',
			'italic',
			'link',
			'bulletedList',
			'numberedList',
			'|',
			'indent',
			'outdent',
			'|',
			'imageUpload',
			'blockQuote',
			'insertTable',
			'mediaEmbed',
			'undo',
			'redo'
		]
	},
	image: {
		toolbar: [
			'imageStyle:block',
			'imageStyle:side',
			'|',
			'imageTextAlternative'
		]
	},
	table: {
		contentToolbar: [
			'tableColumn',
			'tableRow',
			'mergeTableCells'
		]
	},
	// This value must be kept in sync with the language defined in webpack.config.js.
	language: 'en'
};

export default {
	ClassicEditor,
	Context,
	ContextWatchdog
};
