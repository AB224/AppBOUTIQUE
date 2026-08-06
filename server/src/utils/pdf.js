const PDFDocument = require("pdfkit");

const formatCurrency = (value) =>
  new Intl.NumberFormat("fr-GN", {
    style: "currency",
    currency: "GNF",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

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
          `${item.description} | Qt: ${item.quantity} | PU: ${formatCurrency(item.unitPrice)} | Total: ${formatCurrency(item.total)}`
        );
    });

    doc.moveDown();
    doc.fontSize(12).text(`Sous-total: ${formatCurrency(invoice.subtotal)}`, { align: "right" });
    doc.text(`Taxes: ${formatCurrency(invoice.tax)}`, { align: "right" });
    doc.fontSize(15).text(`Total: ${formatCurrency(invoice.total)}`, { align: "right" });
    doc.moveDown(2);
    doc.fontSize(10).fillColor("#666").text("Merci pour votre confiance.", { align: "center" });
    doc.end();
  });

module.exports = { generateInvoicePdfBuffer };
