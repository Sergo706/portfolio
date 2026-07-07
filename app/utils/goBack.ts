export function goBack(fallBack: string) {
  const router = useRouter();
  const state = window.history.state as { back?: string } | null;
  if (state?.back) {
    router.back();
  } else {
    void router.push(fallBack);
  }
}