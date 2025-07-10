import axios from "axios";

export const fetchAllReviews = async () => {
    const res = await axios.get("/depannage/api/admin/reviews/", {
        headers: { Authorization: `