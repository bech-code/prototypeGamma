import React, { useState } from 'react';

const ContactSupportForm: React.FC = () => {
    const [form, setForm] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
        attachment: null as File | null,
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setForm(prev => ({ ...prev, attachment: e.target.files![0] }));
        }
    };

    const validate = () => {
        if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
            setError('Tous les champs sont obligatoires.');
            return false;
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
            setError('Adresse email invalide.');
            return false;
        }
        if (form.attachment && form.attachment.size > 5 * 1024 * 1024) {
            setError('La pièce jointe ne doit pas dépasser 5 Mo.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!validate()) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', form.name);
            formData.append('email', form.email);
            formData.append('subject', form.subject);
            formData.append('message', form.message);
            if (form.attachment) formData.append('attachment', form.attachment);
            const response = await fetch('/depannage/api/support/', {
                method: 'POST',
                body: formData,
            });
            if (response.ok) {
                setSuccess('Votre demande a bien été envoyée. Nous vous répondrons rapidement.');
                setForm({ name: '', email: '', subject: '', message: '', attachment: null });
            } else {
                const data = await response.json();
                setError(data?.detail || data?.message || 'Erreur lors de l\'envoi.');
            }
        } catch (e) {
            setError('Erreur réseau ou serveur.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-8 mt-10">
            <h2 className="text-2xl font-bold mb-6 text-center text-orange-700">Contact Support</h2>
            {success && <div className="bg-green-100 text-green-800 p-3 rounded mb-4">{success}</div>}
            {error && <div className="bg-red-100 text-red-800 p-3 rounded mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Nom</label>
                    <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Sujet</label>
                    <input type="text" name="subject" value={form.subject} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Message</label>
                    <textarea name="message" value={form.message} onChange={handleChange} className="w-full border rounded px-3 py-2" rows={5} required />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Pièce jointe (optionnelle, max 5 Mo)</label>
                    <input type="file" name="attachment" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
                </div>
                <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded" disabled={loading}>
                    {loading ? 'Envoi en cours...' : 'Envoyer'}
                </button>
            </form>
        </div>
    );
};

export default ContactSupportForm; 