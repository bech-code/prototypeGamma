import { rest } from 'msw';

export const handlers = [
    rest.get('/depannage/api/repair-requests/', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                results: [
                    // Cas limite : client null, technician partiel, service incomplet
                    {
                        id: 1,
                        client: null,
                        technician: { id: 2, user: null, phone: null, hourly_rate: null, average_rating: null },
                        service: { id: 3, name: null, description: null, price: null },
                        conversation: null,
                        status: "pending",
                        address: "Rue Inconnue",
                        city: "Bamako",
                        latitude: 12.6,
                        longitude: -8.0,
                        is_urgent: true,
                        created_at: "2024-07-09T12:00:00Z",
                        updated_at: "2024-07-09T12:00:00Z"
                    },
                    // Cas limite : tous les champs string vides
                    {
                        id: 2,
                        client: { id: 0, user: { id: 0, first_name: "", last_name: "", email: "", username: "" }, phone: "", address: "" },
                        technician: null,
                        service: { id: 0, name: "", description: "", price: 0 },
                        conversation: { id: 0, unread_count: 0 },
                        status: "",
                        address: "",
                        city: "",
                        latitude: null,
                        longitude: null,
                        is_urgent: false,
                        created_at: "",
                        updated_at: ""
                    }
                ]
            })
        );
    }),
    // Ajoute d'autres handlers pour d'autres endpoints si besoin
]; 