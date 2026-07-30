export function Spinner({ className = "" }) {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{
          borderColor: "rgba(201,168,76,0.25)",
          borderTopColor: "#C9A84C",
        }}
      />
    </div>
  );
}

export function PageLoader({ className = "min-h-screen" }) {
  return <Spinner className={className} />;
}
