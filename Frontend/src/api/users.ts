import axios from "axios";

export const fetchUsers = async () => {
    const res = await axios.get("/depannage/api/admin/users/", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return res.data;
};

export const deleteUser = async (id: number) => {
    return axios.delete(`/depannage/api/admin/users/${id}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
};

export const resetUserPassword = async (id: number) => {
    return axios.post(`/depannage/api/admin/users/${id}/reset_password/`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
};

export const toggleUserActive = async (id: number, isActive: boolean) => {
    return axios.patch(`/depannage/api/admin/users/${id}/`, { is_active: isActive }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
}; 