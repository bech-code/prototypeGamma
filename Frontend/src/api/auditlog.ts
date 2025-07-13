import axios from "axios";

export const fetchAuditLogs = async () => {
    const res = await axios.get("/depannage/api/admin/audit-logs/", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return res.data;
}; 