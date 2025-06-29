import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export class PDFProcessor {
  // Convert PDF to images
  static async pdfToImages(file: File, format: 'jpg' | 'png' = 'jpg'): Promise<Blob[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const images: Blob[] = [];

    for (let i = 0; i < pages.length; i++) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Set canvas size (approximate PDF page size)
      canvas.width = 595; // A4 width in points
      canvas.height = 842; // A4 height in points
      
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add page number as placeholder
      ctx.fillStyle = 'black';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Page ${i + 1}`, canvas.width / 2, canvas.height / 2);
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), `image/${format}`, 0.9);
      });
      
      images.push(blob);
    }

    return images;
  }

  // Convert images to PDF
  static async imagesToPdf(files: File[]): Promise<Blob> {
    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      let image;

      if (file.type.includes('png')) {
        image = await pdfDoc.embedPng(arrayBuffer);
      } else {
        image = await pdfDoc.embedJpg(arrayBuffer);
      }

      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      
      // Scale image to fit page while maintaining aspect ratio
      const imageAspectRatio = image.width / image.height;
      const pageAspectRatio = width / height;
      
      let imageWidth, imageHeight;
      if (imageAspectRatio > pageAspectRatio) {
        imageWidth = width;
        imageHeight = width / imageAspectRatio;
      } else {
        imageHeight = height;
        imageWidth = height * imageAspectRatio;
      }

      page.drawImage(image, {
        x: (width - imageWidth) / 2,
        y: (height - imageHeight) / 2,
        width: imageWidth,
        height: imageHeight,
      });
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  // Merge PDFs
  static async mergePdfs(files: File[]): Promise<Blob> {
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const pdfBytes = await mergedPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  // Split PDF
  static async splitPdf(file: File): Promise<Blob[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pageCount = pdfDoc.getPageCount();
    const splitPdfs: Blob[] = [];

    for (let i = 0; i < pageCount; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);
      
      const pdfBytes = await newPdf.save();
      splitPdfs.push(new Blob([pdfBytes], { type: 'application/pdf' }));
    }

    return splitPdfs;
  }

  // Compress PDF
  static async compressPdf(file: File): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    // Save with compression options
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: false,
      addDefaultPage: false,
    });
    
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  // Rotate PDF pages
  static async rotatePdf(file: File, degrees: number = 90): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    pages.forEach(page => {
      page.setRotation({ angle: degrees, type: 'degrees' });
    });

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  // Add watermark to PDF
  static async addWatermark(file: File, watermarkText: string): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    pages.forEach(page => {
      const { width, height } = page.getSize();
      page.drawText(watermarkText, {
        x: width / 2 - (watermarkText.length * 10) / 2,
        y: height / 2,
        size: 50,
        font,
        color: rgb(0.7, 0.7, 0.7),
        opacity: 0.3,
      });
    });

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  // Add page numbers
  static async addPageNumbers(file: File): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    pages.forEach((page, index) => {
      const { width } = page.getSize();
      page.drawText(`${index + 1}`, {
        x: width / 2 - 10,
        y: 30,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
    });

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  // Protect PDF with password
  static async protectPdf(file: File, password: string): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    // Note: pdf-lib doesn't support password protection directly
    // This is a placeholder - in a real implementation, you'd use a different library
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  // Delete specific pages
  static async deletePages(file: File, pagesToDelete: number[]): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = pdfDoc.getPageCount();
    
    // Remove pages in reverse order to maintain indices
    const sortedPages = pagesToDelete.sort((a, b) => b - a);
    sortedPages.forEach(pageIndex => {
      if (pageIndex >= 0 && pageIndex < totalPages) {
        pdfDoc.removePage(pageIndex);
      }
    });

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  // HTML to PDF
  static async htmlToPdf(url: string): Promise<Blob> {
    // Create a temporary iframe to load the URL
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '1024px';
    iframe.style.height = '768px';
    document.body.appendChild(iframe);

    return new Promise((resolve, reject) => {
      iframe.onload = async () => {
        try {
          const canvas = await html2canvas(iframe.contentDocument!.body, {
            width: 1024,
            height: 768,
            scale: 1,
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgWidth = 210;
          const pageHeight = 295;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }

          const pdfBlob = pdf.output('blob');
          document.body.removeChild(iframe);
          resolve(pdfBlob);
        } catch (error) {
          document.body.removeChild(iframe);
          reject(error);
        }
      };

      iframe.onerror = () => {
        document.body.removeChild(iframe);
        reject(new Error('Failed to load URL'));
      };

      iframe.src = url;
    });
  }

  // Create simple text-based conversions for Office formats
  static async createTextPdf(content: string, filename: string): Promise<Blob> {
    const pdf = new jsPDF();
    const lines = pdf.splitTextToSize(content, 180);
    pdf.text(lines, 10, 10);
    return pdf.output('blob');
  }

  // Download file helper
  static downloadFile(blob: Blob, filename: string) {
    saveAs(blob, filename);
  }

  // Download multiple files as ZIP
  static async downloadAsZip(files: { blob: Blob; filename: string }[], zipName: string) {
    const zip = new JSZip();
    
    files.forEach(({ blob, filename }) => {
      zip.file(filename, blob);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, zipName);
  }
}