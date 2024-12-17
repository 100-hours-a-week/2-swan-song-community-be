export const formatDateTime = date => {
    const pad = num => String(num).padStart(2, '0');

    if (typeof date === 'string') {
        date = new Date(date);
    }

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
