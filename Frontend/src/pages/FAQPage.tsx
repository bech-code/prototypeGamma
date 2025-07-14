import React, { useEffect, useState } from 'react';

interface FAQ {
    id: number;
    question: string;
    answer: string;
    category: string;
    order: number;
    is_active: boolean;
}

const FAQPage: React.FC = () => {
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFaqs = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/depannage/api/faq/');
                if (response.ok) {
                    const data = await response.json();
                    setFaqs(data.results || data);
                } else {
                    setError('Erreur lors du chargement de la FAQ.');
                }
            } catch {
                setError('Erreur réseau ou serveur.');
            } finally {
                setLoading(false);
            }
        };
        fetchFaqs();
    }, []);

    // Filtrage par recherche
    const filteredFaqs = faqs.filter(faq =>
        faq.question.toLowerCase().includes(search.toLowerCase()) ||
        faq.answer.toLowerCase().includes(search.toLowerCase()) ||
        faq.category.toLowerCase().includes(search.toLowerCase())
    );

    // Regroupement par catégorie
    const categories = Array.from(new Set(filteredFaqs.map(f => f.category).filter(Boolean)));

    return (
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8 mt-10">
            <h2 className="text-2xl font-bold mb-6 text-center text-orange-700">Foire Aux Questions (FAQ)</h2>
            <input
                type="text"
                placeholder="Rechercher une question..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-6"
            />
            {loading && <div className="text-center text-gray-500">Chargement...</div>}
            {error && <div className="bg-red-100 text-red-800 p-3 rounded mb-4">{error}</div>}
            {!loading && !error && categories.length === 0 && (
                <div className="text-center text-gray-500">Aucune question trouvée.</div>
            )}
            {!loading && !error && categories.map(category => (
                <div key={category} className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 text-orange-600">{category || 'Autres'}</h3>
                    <div className="space-y-2">
                        {filteredFaqs.filter(f => f.category === category).map(faq => (
                            <div key={faq.id} className="border rounded">
                                <button
                                    className="w-full text-left px-4 py-3 font-medium focus:outline-none focus:bg-orange-50 hover:bg-orange-50 transition"
                                    onClick={() => setExpanded(expanded === faq.id ? null : faq.id)}
                                    aria-expanded={expanded === faq.id}
                                >
                                    {faq.question}
                                </button>
                                {expanded === faq.id && (
                                    <div className="px-4 py-3 bg-orange-50 border-t text-gray-800 animate-fade-in">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FAQPage; 