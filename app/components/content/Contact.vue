<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { contactSchema } from '~~/shared/types/ContactSchema';

const { profile } = useAppConfig();
const state = ref({
  email: '',
  message: '',
  phone: '',
  fullname: '',
  subject: '',
});


const loading = ref(false);
const token = ref('');
const turnstile = ref<{ reset: () => void } | null>(null);


async function onSubmit() {
  loading.value = true;
  try {
    if (!token.value) {
      toast.error('Please complete the captcha');
      loading.value = false;
      return;
    }

    await $fetch('/api/contact', {
      method: 'POST',
      body: {
        ...state.value,
        token: token.value,
      },
    });

    state.value = {
      email: '',
      message: '',
      phone: '',
      fullname: '',
      subject: '',
    };
    token.value = ''; 
    toast.success('Your message has been sent successfully');
  }
  catch {
    toast.error('Oups, an error occurred while sending your message');
  }
  finally {
    turnstile.value?.reset();
    loading.value = false;
  }
}
</script>

<template>
  <section class="mx-auto mt-4 flex max-w-4xl flex-col p-7 sm:mt-20">
    <h1 class="font-newsreader italic text-white-shadow text-center text-4xl">
      <slot
        name="title"
        mdc-unwrap="p"
      />
    </h1>
    <h2 class="text-center text-lg font-extralight italic text-muted">
      <slot
        name="subtitle"
        mdc-unwrap="p"
      />
    </h2>
    <Divider class="mb-8 mt-2" />
    <div class="flex flex-col sm:items-center sm:justify-between">
      <UForm
        :state
        :schema="contactSchema"
        class="flex w-full max-w-[40rem] flex-col gap-3"
        @submit="onSubmit"
      >
        <UFormField
          label="Fullname"
          name="fullname"
          required
        >
          <UInput
            v-model="state.fullname"
            type="text"
            autocomplete="name"
            class="w-full"
            placeholder="John Doe"
          />
        </UFormField>

        <UFormField
          label="Email"
          name="email"
          required
        >
          <UInput
            v-model="state.email"
            autocomplete="email"
            class="w-full"
            placeholder="john.doe@gmail.com"
          />
        </UFormField>

        <UFormField
          label="Phone"
          name="phone"
        >
          <UInput
            v-model="state.phone"
            autocomplete="tel"
            class="w-full"
            placeholder="123-456-7890"
          />
        </UFormField>

        <UFormField
          label="Subject"
          name="subject"
          required
        >
          <UInput
            v-model="state.subject"
            class="w-full"
            placeholder="Project inquiry"
          />
        </UFormField>

        <UFormField
          label="Message"
          name="message"
          required
        >
          <UTextarea
            v-model="state.message"
            autoresize
            class="w-full"
            :rows="4"
            placeholder="Lets work together!"
          />
        </UFormField>
        <NuxtTurnstile 
          class="w-full"
          ref="turnstile"
          v-model="token"
        />
        <div class="flex justify-center">
          <UButton
            :loading="loading"
            type="submit"
            block
          >
            Send Message
          </UButton>
        </div>
      </UForm>
      <Divider class="my-10" />
      <div class="flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
        <div class="flex flex-col gap-3">
          <dd class="flex items-center gap-3 text-neutral-400">
            <UIcon
              name="heroicons-phone"
              class="size-6"
              aria-hidden="true"
            />
            <span>
              {{ profile.phone }}
            </span>
          </dd>
          <dd class="flex items-center gap-3 text-neutral-400">
            <UIcon
              name="heroicons-envelope"
              class="size-6"
              aria-hidden="true"
            />
            <UTooltip
              text="Send an email"
              :shortcuts="['⌘', 'O']"
            >
              <NuxtLink
                :to="`mailto:${profile.email}`"
                class="cursor-pointer transition-colors duration-300"
              >
                {{ profile.email }}
              </NuxtLink>
            </UTooltip>
          </dd>
        </div>
        <div>
          <MeetingButton />
        </div>
      </div>
    </div>
  </section>
</template>
