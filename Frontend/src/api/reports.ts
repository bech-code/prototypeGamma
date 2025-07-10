import axios from "axios";

export const fetchReports = async () => {
    const res = await axios.get("/depannage/api/reports/", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return res.data;
};

export const updateReportStatus = async (id: number, status: string) => {
    return axios.patch(`/depannage/api/reports/${id}/`, { status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
}; 