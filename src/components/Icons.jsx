const P = {
  dashboard: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  whatsapp: 'M4 20l1.4-4.2A8 8 0 1 1 8.2 18.6L4 20z',
  inbox: 'M3 13h5l1 3h6l1-3h5M5 5h14l2 8v6H3v-6l2-8z',
  contacts: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 20c1-4 4-6 8-6s7 2 8 6',
  email: 'M3 6h18v12H3zM3 7l9 7 9-7',
  payments: 'M3 7h18v10H3zM3 11h18M7 15h3',
  telegram: 'M21 4L3 11l6 2 2 6 3-4 5 4 2-15z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2zM10 21h4',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  reports: 'M5 3h10l4 4v14H5zM8 12h8M8 16h8M8 8h4',
  plug: 'M9 3v5M15 3v5M6 8h12v4a6 6 0 0 1-12 0V8zM12 18v3',
  users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.7-3 3-5 6-5s5.300 2 6 5M17 11a3 3 0 1 0-1-5.800M17 15c2.500.4 4 2.200 4.500 5',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-1-.5-2.300h-4L10 7 8 8 6 7 4 11l2 1v2l-2 1 2 4 2-1 2 1 .5 2.300h4L14 19l2-1 2 1 2-4-2-1v-2z',
  health: 'M12 21s-8-5-8-11a4.500 4.500 0 0 1 8-2.500A4.500 4.500 0 0 1 20 10c0 6-8 11-8 11z',
  webhook: 'M8 15a4 4 0 1 1 5-6M16 9a4 4 0 1 1-1 7H9M12 13l-3 5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  logout: 'M9 4H5v16h4M16 8l4 4-4 4M20 12H9',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.600 6.100A9.600 9.600 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.200 4M6.600 6.600A17 17 0 0 0 2 12s4 7 10 7c1.600 0 3-.4 4.300-1M9.900 9.900a3 3 0 0 0 4.200 4.200',
  plus: 'M12 5v14M5 12h14', close: 'M6 6l12 12M18 6L6 18', refresh: 'M20 11a8 8 0 1 0-2.300 5.600M20 5v6h-6',
};
export function Icon({ name, size = 18, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={P[name] || P.dashboard} />
    </svg>
  );
}
