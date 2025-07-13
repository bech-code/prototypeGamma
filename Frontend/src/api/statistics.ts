import axios from "axios";

export const fetchAdminStats = async () => {
    const res = await axios.get("/depannage/api/dashboard/stats/", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return res.data;
};

export const exportStatisticsPDF = () => {
    window.open("/depannage/api/admin/export-statistics-pdf/", "_blank");
};

export const exportStatisticsExcel = () => {
    window.open("/depannage/api/admin/export-statistics-excel/", "_blank");
}; 