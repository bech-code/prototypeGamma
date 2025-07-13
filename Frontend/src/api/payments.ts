import axios from "axios";

export const fetchPayments = async () => {
    const res = await axios.get("/depannage/api/admin-payments/", {
        headers: { Authorization: `