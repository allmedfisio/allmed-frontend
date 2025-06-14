import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import {
  TemplateService,
  TicketTemplate,
} from 'src/app/services/template.service';
import { QuillEditorComponent } from 'ngx-quill';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-ticket-config',
  templateUrl: './ticket-config.page.html',
  styleUrls: ['./ticket-config.page.scss'],
  standalone: false,
})
export class TicketConfigPage implements OnInit {
  @ViewChild('quillEditor', { static: false })
  quillEditorComponent!: QuillEditorComponent;

  private quillInstance: any;

  form!: FormGroup;
  quillModules: any;
  template!: TicketTemplate;

  constructor(
    private fb: FormBuilder,
    private tplService: TemplateService,
    private toastCtrl: ToastController
  ) {
    // Inizializzo subito il form
    this.form = this.fb.group({
      headerText: [''],
      headerImageUrl: [''],
      promoHtml: [''],
      footerText: [''],
      primaryColor: [''],
    });

    // Definizione del toolbar con handler custom
    this.quillModules = {
      toolbar: {
        container: [
          ['bold', 'italic', 'underline'],
          [{ header: 1 }, { header: 2 }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'], // “image” dà il bottone
          ['clean'],
        ],
        handlers: {
          image: this.imageHandler.bind(this), // ← bind al metodo
        },
      },
    };
  }

  ngOnInit(): void {
    this.tplService.getTemplate().subscribe((tpl) => {
      this.template = tpl;
      // Patcho il form con i valori dal DB
      this.form.patchValue({
        headerText: tpl.headerText,
        headerImageUrl: tpl.headerImageUrl,
        promoHtml: tpl.promoHtml,
        footerText: tpl.footerText,
        primaryColor: tpl.styleJson.primaryColor,
      });
    });
  }

  async save() {
    if (this.form.invalid) {
      return;
    }

    const v = this.form.value;
    const data: Partial<TicketTemplate> = {
      headerText: v.headerText,
      headerImageUrl: v.headerImageUrl,
      promoHtml: v.promoHtml,
      footerText: v.footerText,
      styleJson: {
        primaryColor: v.primaryColor,
      },
    };

    console.log('Invio a updateTemplate:', data);
    const updated = await firstValueFrom(this.tplService.updateTemplate(data));
    console.log('Risposta dal server:', updated);

    this.presentToast(`Ticket modificato con successo`, 'success');
  }

  onEditorCreated(quill: any) {
    this.quillInstance = quill; // ← quill è l’istanza di Quill
  }

  /** apre file picker e carica su Storage, poi inserisce <img> */
  async imageHandler() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.click();

    input.onchange = async () => {
      const file: File = input.files![0];
      if (!file) return;

      if (!this.quillInstance) {
        console.error('Editor non ancora pronto!');
        return;
      }

      const { url } = await firstValueFrom(
        this.tplService.uploadPromoImage(file)
      );

      // 4) inserisci l’immagine in Quill
      const range = this.quillInstance.getSelection(true);
      this.quillInstance.insertEmbed(range.index, 'image', url, 'user');
      this.quillInstance.setSelection(range.index + 1);

      // 3) Aggiorna il FormControl 'promoHtml' con l'HTML corrente
      const html = this.quillInstance.root.innerHTML;
      this.form.get('promoHtml')!.setValue(html);
    };
  }

  // Toast

  async presentToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
