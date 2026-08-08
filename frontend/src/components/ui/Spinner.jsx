export function Spinner({ className = "" }) {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{
          borderColor: "rgba(70,44,125,0.18)",
          borderTopColor: "#462C7D",
        }}
      />
    </div>
  );
}

export function PageLoader({ className = "min-h-screen" }) {
  return <Spinner className={className} />;
}
