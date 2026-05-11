<template>
  <div class="mt-4">
    <h1 class="text-4xl bold glow mb-4">Rules</h1>
    <p class="mb-4">
      Here you can find the rules of {{ WEBSITE_NAME }}, what you need to do,
      and what you need for your project.
    </p>
    <p class="mb-4">
      Note: this page is still incomplete and will likely change before the
      start of the hackathon!
    </p>
    <h2 class="text-3xl bold mb-2">Requirements</h2>
    <p class="mb-2">
      The following items are <span class="bold">required</span>. Without them,
      your project will not be valid and will be rejected.
    </p>
    <ul class="mb-4">
      <li class="mb-2">
        * <span class="bold">An open-source repository.</span> Your project code
        must be open-source on
        <ULink href="https://github.com" target="_blank">GitHub</ULink>
        (preferred) or
        <ULink href="https://gitee.com" target="_blank">Gitee</ULink>. A zip
        archive or similar will NOT be accepted.
      </li>
      <li class="mb-2">
        * <span class="bold">A README file</span>. This should be a file called
        <code>README.md</code> in your repository. It should contain a brief
        description of your project, instructions to use it (website link,
        download &amp; setup instructions, etc.), the technologies used, and the
        demo video (if applicable).
      </li>
      <li class="mb-2">
        * <span class="bold">A public demo URL.</span> Your project must be
        experienceable by anyone on any device. For different projects, this
        means different things:
        <ul class="indent-[2ch] mt-1">
          <li class="mb-1">
            * <span class="bold">Websites</span> must be deployed and accessible
            to the public. If it requires authentication, anyone must be able to
            register for an account (demo accounts only are not allowed). The
            demo URL should be the link to the website.
          </li>
          <li class="mb-1">
            * <span class="bold">Desktop apps</span> must be built into an
            executable file for either Windows or macOS (ideally both). The demo
            URL should be a link to a page that contains the executable download
            (such as a GitHub or Gitee release).
          </li>
          <li class="mb-1">
            * <span class="bold">Games</span> must either be playable in the
            browser (such as deployed on
            <ULink href="https://itch.io" target="_blank">itch.io</ULink>), or
            have executables like a desktop app. The demo URL should be a link
            to play the game or download an executable.
          </li>
          <li>
            * <span class="bold">Mobile apps</span> must be released in the
            respective app store or otherwise be readily available (such as
            through an APK or IPA build). The demo URL should be the app store
            link or a link to a page with the downloads.
          </li>
        </ul>
      </li>
      <li class="mb-2">
        * <span class="bold">A demo video</span>. This should be 1-3 minutes and
        demonstrate the main features of your project. It however does NOT waive
        the demo URL requirement.
      </li>
      <li>
        * The project must follow the theme. It must have at least some kind of
        connection with the theme. This won't be very strict, but you will lose
        points if your connection is very week (see the rubric below).
      </li>
    </ul>
  </div>
</template>
