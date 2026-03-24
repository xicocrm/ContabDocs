export function AsaasLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#0066FF"/>
      <path d="M20 8C13.373 8 8 13.373 8 20C8 26.627 13.373 32 20 32C26.627 32 32 26.627 32 20C32 13.373 26.627 8 20 8Z" fill="#0066FF"/>
      <rect width="40" height="40" rx="10" fill="url(#asaas_grad)"/>
      <defs>
        <linearGradient id="asaas_grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0052CC"/>
          <stop offset="1" stopColor="#0099FF"/>
        </linearGradient>
      </defs>
      <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="20" fontWeight="800" fontFamily="Arial, sans-serif">a</text>
    </svg>
  );
}

export function EfiPayLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="url(#efi_grad)"/>
      <defs>
        <linearGradient id="efi_grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00A650"/>
          <stop offset="1" stopColor="#00C96E"/>
        </linearGradient>
      </defs>
      <rect x="8" y="13" width="24" height="16" rx="3" fill="white" fillOpacity="0.2"/>
      <rect x="8" y="13" width="24" height="5" rx="2" fill="white" fillOpacity="0.5"/>
      <rect x="10" y="22" width="8" height="2.5" rx="1" fill="white"/>
      <rect x="20" y="22" width="5" height="2.5" rx="1" fill="white" fillOpacity="0.6"/>
      <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="800" fontFamily="Arial, sans-serif">EFÍ</text>
    </svg>
  );
}

export function BancoInterLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="url(#inter_grad)"/>
      <defs>
        <linearGradient id="inter_grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E05A00"/>
          <stop offset="1" stopColor="#FF8C00"/>
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="10" fill="white" fillOpacity="0.15"/>
      <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="8" fontWeight="800" fontFamily="Arial, sans-serif" letterSpacing="-0.5">INTER</text>
    </svg>
  );
}

export function MercadoPagoLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="url(#mp_grad)"/>
      <defs>
        <linearGradient id="mp_grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#009EE3"/>
          <stop offset="1" stopColor="#00B9F2"/>
        </linearGradient>
      </defs>
      <path d="M20 10C20 10 11 16.5 11 21.5C11 24.5 14 27 17 26C18.5 25.5 19.5 24.5 20 23.5C20.5 24.5 21.5 25.5 23 26C26 27 29 24.5 29 21.5C29 16.5 20 10 20 10Z" fill="#FFCC00"/>
    </svg>
  );
}

export function WavoipLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#25D366"/>
      <path d="M20 9C14 9 9 14 9 20C9 22 9.5 23.8 10.5 25.3L9 31L14.9 29.5C16.4 30.4 18.1 31 20 31C26 31 31 26 31 20C31 14 26 9 20 9Z" fill="white" fillOpacity="0.9"/>
      <path d="M16.5 14.5C16.2 13.8 15.6 13.8 15.3 13.8C15 13.8 14.7 13.8 14.4 13.8C14.1 13.8 13.6 13.9 13.2 14.4C12.7 14.9 11.5 16 11.5 18.3C11.5 20.6 13.3 22.8 13.5 23.1C13.7 23.4 16.8 28.2 21.5 30C22.8 30.5 23.8 30.8 24.6 30.9C25.9 31.1 27.1 31 28 30.5C29 30 30.1 29 30.4 27.9C30.6 26.9 30.6 26 30.5 25.8C30.4 25.6 30.1 25.5 29.7 25.3C29.3 25.1 27.1 24 26.7 23.8C26.3 23.7 26 23.6 25.7 24.1C25.4 24.6 24.5 25.6 24.3 25.9C24 26.2 23.8 26.2 23.4 26C23 25.8 21.7 25.4 20.2 24C19 22.9 18.2 21.5 17.9 21C17.7 20.6 17.9 20.3 18.1 20.1C18.3 19.9 18.6 19.6 18.8 19.3C19 19.1 19.1 18.9 19.2 18.6C19.4 18.3 19.3 18 19.2 17.8C19 17.6 18.3 15.3 16.5 14.5Z" fill="#25D366"/>
    </svg>
  );
}

export function WhatiketLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#7C3AED"/>
      <path d="M12 15C12 13.9 12.9 13 14 13H26C27.1 13 28 13.9 28 15V22C28 23.1 27.1 24 26 24H22L18 28V24H14C12.9 24 12 23.1 12 22V15Z" fill="white" fillOpacity="0.9"/>
      <circle cx="16" cy="18.5" r="1.5" fill="#7C3AED"/>
      <circle cx="20" cy="18.5" r="1.5" fill="#7C3AED"/>
      <circle cx="24" cy="18.5" r="1.5" fill="#7C3AED"/>
    </svg>
  );
}

export function FalePacoLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#0EA5E9"/>
      <path d="M28 12H12C10.9 12 10 12.9 10 14V24C10 25.1 10.9 26 12 26H16V30L22 26H28C29.1 26 30 25.1 30 24V14C30 12.9 29.1 12 28 12Z" fill="white" fillOpacity="0.9"/>
      <circle cx="16" cy="19" r="1.5" fill="#0EA5E9"/>
      <circle cx="20" cy="19" r="1.5" fill="#0EA5E9"/>
      <circle cx="24" cy="19" r="1.5" fill="#0EA5E9"/>
    </svg>
  );
}
