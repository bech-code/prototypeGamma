import axios from "axios";

export const fetchSystemConfig = async () => {
    const res = await axios.get("/core/api/system-config/", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return res.data;
};

export const updateSystemConfig = async (id: number, value: string) => {
    return axios.patch(`/core/api/system-config/${id}/`, { value }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
}; 