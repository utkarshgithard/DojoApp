export function convertTo12Hour(time) {
  const [hour, minute] = time.split(':');
  let h = parseInt(hour);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${minute} ${suffix}`;
}
