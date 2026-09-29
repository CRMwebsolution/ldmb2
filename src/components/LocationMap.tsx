const mapEmbedUrl =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3276.0319353554596!2d-76.89297239999999!3d34.8051384!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89a8ebb5d0052491%3A0x809852938595cb0d!2s759%20Tom%20Mann%20Rd%2C%20Newport%2C%20NC%2028570%2C%20USA!5e0!3m2!1sen!2suk!4v1790641064594!5m2!1sen!2suk";

export function LocationMap({ className }: { className: string }) {
  return (
    <iframe
      title="Map near Little Doo Mud Bog"
      className={className}
      src={mapEmbedUrl}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      style={{ border: 0 }}
    />
  );
}
