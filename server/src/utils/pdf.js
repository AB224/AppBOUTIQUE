const PDFDocument = require("pdfkit");

const generateInvoicePdfBuffer = (invoice, customer) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    doc.fontSize(22).text("Facture", { align: "right" });
    doc.moveDown();
    doc.fontSize(12).text(`Numero: ${invoice.invoiceNumber}`);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString("fr-FR")}`);
    doc.text(`Echeance: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("fr-FR") : "-"}`);
    doc.moveDown();

    doc.fontSize(14).text("Client");
    doc.fontSize(12).text(customer.name);
    doc.text(customer.email || "");
    doc.text(customer.phone || "");
    doc.moveDown();

    doc.fontSize(14).text("Details");
    doc.moveDown(0.5);
    invoice.items.forEach((item) => {
      doc
        .fontSize(11)
        .text(
          `${item.description} | Qt: ${item.quantity} | PU: ${item.unitPrice.toFixed(2)} EUR | Total: ${item.total.toFixed(2)} EUR`
        );
    });

    doc.moveDown();
    doc.fontSize(12).text(`Sous-total: ${invoice.subtotal.toFixed(2)} EUR`, { align: "right" });
    doc.text(`Taxes: ${invoice.tax.toFixed(2)} EUR`, { align: "right" });
    doc.fontSize(15).text(`Total: ${invoice.total.toFixed(2)} EUR`, { align: "right" });
    doc.moveDown(2);
    doc.fontSize(10).fillColor("#666").text("Merci pour votre confiance.", { align: "center" });
    doc.end();
  });

module.exports = { generateInvoicePdfBuffer };
