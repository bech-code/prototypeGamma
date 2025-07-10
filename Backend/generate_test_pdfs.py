from reportlab.pdfgen import canvas

# Générer un PDF pour la pièce d'identité
def create_pdf(path, text):
    c = canvas.Canvas(path)
    c.drawString(100, 750, text)
    c.save()

create_pdf('test_piece_identite.pdf', 'Test identité')
create_pdf('test_certificat_residence.pdf', 'Test résidence')

print('PDFs de test générés avec succès.') 