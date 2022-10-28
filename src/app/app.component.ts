import { Component } from '@angular/core';
import * as CustomEditor from '../assets/ckeditor/cksource';
import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
// import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { LinkedList } from './linked-list';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'ckeditor-demo';
  public Editor: any = CustomEditor.ClassicEditor;

  public constructor() {
    const list = new LinkedList();
    list.add(2);
    list.add(5);
    list.add(7);
    list.add(8);
    list.add(12);
    list.add(3);

    list.sort();
    // list.print();
  }

  public model = {
    editorData: ''
  };

  public comments: string[] = ['A comment'];


  public onClickAddComment(): void {
    this.comments.push(this.model.editorData);
    this.model.editorData = '';
  }

}
