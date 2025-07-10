import axios from "axios";

export const fetchAdminNotifications = async () => {
    const res = await axios.get("/depannage/api/admin-notifications/", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return res.data;
};

export const markAdminNotificationAsRead = async (id: number) => {
    return axios.patch(`/depannage/api/admin-notifications/${id}/`, { is_read: true }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
}; 