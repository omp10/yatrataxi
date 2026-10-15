// Client-side price preview for venue tickets. The server re-prices every order.

const toDateText = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const isWeekendDate = (dateText) => [0, 6].includes(new Date(`${dateText}T00:00:00`).getDay());

export const unitPriceFor = (ticket, dateText) => (
  isWeekendDate(dateText) && Number(ticket.weekendPrice) > 0 ? Number(ticket.weekendPrice) : Number(ticket.price)
);

// Next bookable dates for a venue (booking window, minus closed dates).
export const buildDateOptions = (venue, limit = 21) => {
  const closed = new Set(venue?.closedDates || []);
  const days = Math.min(limit, Number(venue?.bookingWindowDays) || 30);
  const options = [];
  for (let i = 0; i <= days; i += 1) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const text = toDateText(date);
    if (!closed.has(text)) {
      options.push({
        value: text,
        day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
        label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      });
    }
  }
  return options;
};

export const summarizeSelection = (venue, visitDate, quantities) => {
  const items = (venue?.ticketTypes || [])
    .filter((ticket) => (quantities[ticket.id] || 0) > 0)
    .map((ticket) => ({ ticketTypeId: ticket.id, quantity: quantities[ticket.id], amount: unitPriceFor(ticket, visitDate) * quantities[ticket.id] }));
  return {
    items: items.map(({ ticketTypeId, quantity }) => ({ ticketTypeId, quantity })),
    totalTickets: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.amount, 0),
  };
};

export const todayDateText = () => toDateText(new Date());
