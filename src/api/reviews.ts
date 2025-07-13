// Reviews API - squelette

export async function fetchReviews(token: string) {
    return fetch('/depannage/api/reviews/', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
} 